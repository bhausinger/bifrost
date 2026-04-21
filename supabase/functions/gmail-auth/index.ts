import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const GOOGLE_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GMAIL_REDIRECT_URI')!
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getUser(req: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (error || !user) return null
  return { id: user.id, email: user.email ?? '' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.split('/').pop()

  const user = await getUser(req)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // GET /gmail-auth/auth-url — generate OAuth consent URL
  if (path === 'auth-url' && req.method === 'GET') {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: user.id,
    })
    return jsonResponse({
      success: true,
      authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    })
  }

  // POST /gmail-auth/callback — exchange auth code for tokens
  if (path === 'callback' && req.method === 'POST') {
    const body = await req.json()
    const { code, provider_token, provider_refresh_token } = body

    let accessToken: string
    let refreshToken: string | null = null
    let expiresIn = 3600

    if (provider_token) {
      // Direct token sync from Supabase Google OAuth login
      accessToken = provider_token
      refreshToken = provider_refresh_token ?? null
    } else if (code) {
      // Manual OAuth code exchange (from Settings connect flow)
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        return jsonResponse({ error: 'Token exchange failed', detail: err }, 400)
      }

      const tokens = await tokenRes.json()
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token ?? null
      expiresIn = tokens.expires_in ?? 3600
    } else {
      return jsonResponse({ error: 'Missing code or provider_token' }, 400)
    }

    // Get user's Gmail email
    let gmailEmail = ''
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (profileRes.ok) {
        const profile = await profileRes.json()
        gmailEmail = profile.email ?? ''
      }
    } catch { /* non-critical */ }

    // Upsert tokens
    const { error: dbError } = await supabase.from('user_google_tokens').upsert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes: SCOPES,
      gmail_email: gmailEmail,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (dbError) {
      return jsonResponse({ error: 'Failed to store tokens', detail: dbError.message }, 500)
    }

    return jsonResponse({ success: true, email: gmailEmail })
  }

  // GET /gmail-auth/status — check connection status
  if (path === 'status' && req.method === 'GET') {
    const { data } = await supabase
      .from('user_google_tokens')
      .select('gmail_email, token_expiry, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!data) {
      return jsonResponse({ connected: false })
    }

    return jsonResponse({
      connected: true,
      email: data.gmail_email,
      tokenExpiry: data.token_expiry,
      updatedAt: data.updated_at,
    })
  }

  // POST /gmail-auth/disconnect — remove tokens
  if (path === 'disconnect' && req.method === 'POST') {
    await supabase.from('user_google_tokens').delete().eq('user_id', user.id)
    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: 'Not found' }, 404)
})
