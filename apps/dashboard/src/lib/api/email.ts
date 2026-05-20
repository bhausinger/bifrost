import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'

const FUNCTIONS_URL = `${env.VITE_SUPABASE_URL}/functions/v1`

type EmailSendPayload = {
  to: string
  subject: string
  htmlBody: string
  senderEmail: string
  senderName?: string
}

type EmailSendResponse = { messageId: string }

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

export async function emailSendSingle(payload: EmailSendPayload): Promise<EmailSendResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/resend-send/single`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Email send failed: ${res.status}`)
  return data as EmailSendResponse
}
