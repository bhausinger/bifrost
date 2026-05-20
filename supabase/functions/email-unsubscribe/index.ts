import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const DASHBOARD_URL = 'https://bifrost-eta.vercel.app'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function redirect(path: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `${DASHBOARD_URL}${path}` },
  })
}

serve(async (req) => {
  if (req.method !== 'GET') {
    return redirect('/unsubscribed.html?error=1')
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return redirect('/unsubscribed.html?error=1')
  }

  let email: string
  try {
    email = atob(token).toLowerCase().trim()
  } catch {
    return redirect('/unsubscribed.html?error=1')
  }

  if (!email || !email.includes('@')) {
    return redirect('/unsubscribed.html?error=1')
  }

  // Check if already excluded (partial unique index doesn't support upsert)
  const { data: existing } = await supabase
    .from('excluded_artists')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!existing) {
    const { error } = await supabase.from('excluded_artists').insert({
      email,
      reason: 'unsubscribed',
      notes: 'Self-unsubscribed via email link',
    })

    if (error) {
      return redirect('/unsubscribed.html?error=1')
    }
  }

  return redirect('/unsubscribed.html')
})
