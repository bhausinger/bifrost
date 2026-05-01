import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'

const FUNCTIONS_URL = `${env.VITE_SUPABASE_URL}/functions/v1`

type GmailStatusResponse = { connected: boolean; email?: string }
type GmailAuthUrlResponse = { authUrl: string }
type GmailSendPayload = {
  to: string
  subject: string
  htmlBody: string
}
type GmailSendResponse = { messageId: string; threadId: string }
type GmailSyncPayload = {
  provider_token: string
  provider_refresh_token: string | null
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: env.VITE_SUPABASE_ANON_KEY,
  }
}

export async function gmailStatus(): Promise<GmailStatusResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/gmail-auth/status`, { headers })
  if (!res.ok) throw new Error(`Gmail status failed: ${res.status}`)
  return res.json()
}

export async function gmailAuthUrl(): Promise<GmailAuthUrlResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/gmail-auth/auth-url`, { headers })
  if (!res.ok) throw new Error(`Gmail auth URL failed: ${res.status}`)
  return res.json()
}

export async function gmailCallback(code: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/gmail-auth/callback`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error(`Gmail callback failed: ${res.status}`)
}

export async function gmailSyncTokens(payload: GmailSyncPayload): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/gmail-auth/callback`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Gmail token sync failed: ${res.status}`)
}

export async function gmailDisconnect(): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/gmail-auth/disconnect`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) throw new Error(`Gmail disconnect failed: ${res.status}`)
}

export async function gmailSendSingle(payload: GmailSendPayload): Promise<GmailSendResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/gmail-send/single`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Gmail send failed: ${res.status}`)
  return data as GmailSendResponse
}
