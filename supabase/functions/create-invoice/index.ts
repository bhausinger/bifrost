import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      pipeline_entry_id,
      artist_email,
      artist_name,
      amount,
      description,
      package_type,
      due_days = 7,
    } = await req.json()

    if (!artist_email || !amount) {
      return new Response(
        JSON.stringify({ error: 'artist_email and amount are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: artist_email, limit: 1 })
    let customer: Stripe.Customer

    if (customers.data.length > 0) {
      customer = customers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: artist_email,
        name: artist_name,
        metadata: {
          pipeline_entry_id: pipeline_entry_id || '',
          source: 'campaign_manager',
        },
      })
    }

    // Create the invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: due_days,
      metadata: {
        pipeline_entry_id: pipeline_entry_id || '',
        source: 'campaign_manager',
      },
    })

    // Add line item
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      description: description || `Spotify Playlist Placement — ${package_type || 'Standard'}`,
    })

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
    await stripe.invoices.sendInvoice(invoice.id)

    // Log the invoice in our database
    if (pipeline_entry_id) {
      await supabase.from('pipeline_activities').insert({
        pipeline_entry_id,
        type: 'invoice_sent',
        description: `Invoice sent for $${amount} to ${artist_email}`,
        metadata: {
          stripe_invoice_id: finalizedInvoice.id,
          stripe_invoice_url: finalizedInvoice.hosted_invoice_url,
          amount,
        },
        created_by: user.id,
      })
    }

    return new Response(
      JSON.stringify({
        invoice_id: finalizedInvoice.id,
        invoice_url: finalizedInvoice.hosted_invoice_url,
        invoice_pdf: finalizedInvoice.invoice_pdf,
        status: finalizedInvoice.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
