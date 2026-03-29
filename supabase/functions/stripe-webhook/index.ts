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

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const pipelineEntryId = invoice.metadata?.pipeline_entry_id

      if (pipelineEntryId) {
        // Move pipeline entry to "paid" stage
        await supabase.rpc('move_pipeline_stage', {
          entry_id: pipelineEntryId,
          new_stage: 'paid',
          note: `Payment received — Stripe Invoice ${invoice.id}`,
        })

        // Get the pipeline entry to find the artist
        const { data: entry } = await supabase
          .from('pipeline_entries')
          .select('artist_id, deal_value')
          .eq('id', pipelineEntryId)
          .single()

        if (entry) {
          // Record the transaction
          const amountPaid = (invoice.amount_paid ?? 0) / 100 // cents to dollars
          await supabase.from('transactions').insert({
            type: 'income',
            amount: amountPaid,
            description: `Payment from ${invoice.customer_email} — Invoice ${invoice.number}`,
            category: 'client_payment',
            artist_id: entry.artist_id,
            payment_method: 'stripe',
            reference_id: invoice.id,
            transaction_date: new Date().toISOString().split('T')[0],
          })
        }

        // Log activity
        await supabase.from('pipeline_activities').insert({
          pipeline_entry_id: pipelineEntryId,
          type: 'payment_received',
          description: `Payment of $${((invoice.amount_paid ?? 0) / 100).toFixed(2)} received via Stripe`,
          metadata: {
            stripe_invoice_id: invoice.id,
            amount: (invoice.amount_paid ?? 0) / 100,
            payment_intent: invoice.payment_intent,
          },
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const pipelineEntryId = invoice.metadata?.pipeline_entry_id

      if (pipelineEntryId) {
        await supabase.from('pipeline_activities').insert({
          pipeline_entry_id: pipelineEntryId,
          type: 'payment_failed',
          description: `Payment failed for invoice ${invoice.number}`,
          metadata: {
            stripe_invoice_id: invoice.id,
            attempt_count: invoice.attempt_count,
          },
        })
      }
      break
    }

    case 'invoice.overdue': {
      const invoice = event.data.object as Stripe.Invoice
      const pipelineEntryId = invoice.metadata?.pipeline_entry_id

      if (pipelineEntryId) {
        await supabase.from('pipeline_activities').insert({
          pipeline_entry_id: pipelineEntryId,
          type: 'invoice_overdue',
          description: `Invoice ${invoice.number} is overdue`,
          metadata: { stripe_invoice_id: invoice.id },
        })
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
