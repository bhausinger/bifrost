import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts'

const GOOGLE_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')!
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

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

// ── Token management ────────────────────────────────────────────────

async function getValidToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_google_tokens')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data?.refresh_token) return null

  // Refresh if expired or expiring within 5 minutes
  const expiresAt = data.token_expiry ? new Date(data.token_expiry).getTime() : 0
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshToken(userId, data.refresh_token)
    return refreshed
  }

  return data.access_token
}

async function refreshToken(userId: string, refreshTokenStr: string): Promise<string | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json()
  await supabase.from('user_google_tokens').update({
    access_token: tokens.access_token,
    token_expiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return tokens.access_token
}

// ── Gmail API helpers ───────────────────────────────────────────────

function buildMimeMessage(opts: {
  to: string
  from: string
  subject: string
  htmlBody: string
  textBody: string
}): string {
  const boundary = '----Bifrost' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

  const headers = [
    `To: ${opts.to}`,
    `From: ${opts.from}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  const message = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    opts.textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n')

  // Gmail API needs base64url encoding (replace +/ with -_, strip =)
  return encode(new TextEncoder().encode(message))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sendGmailMessage(
  accessToken: string,
  rawMessage: string,
): Promise<{ id: string; threadId: string }> {
  const res = await fetch(`${GMAIL_API}/users/me/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawMessage }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return { id: data.id, threadId: data.threadId }
}

async function getGmailSignature(
  accessToken: string,
  sendAsEmail: string,
): Promise<string> {
  try {
    const res = await fetch(
      `${GMAIL_API}/users/me/settings/sendAs/${encodeURIComponent(sendAsEmail)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return ''
    const data = await res.json()
    return data.signature ?? ''
  } catch {
    return ''
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function cleanArtistName(name: string): string {
  return (name || 'Artist')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/^Stream\s+/i, '')
    .replace(/\s+music$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Auth helper ─────────────────────────────────────────────────────

async function getUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (error || !user) return null
  return { id: user.id }
}

// ── Main handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    const user = await getUser(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // POST /gmail-send/single — send one email
    if (path === 'single') {
      return await handleSingleSend(user.id, req)
    }

    // POST /gmail-send/bulk — send bulk with NDJSON streaming
    if (path === 'bulk') {
      return await handleBulkSend(user.id, req)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal server error' }, 500)
  }
})

// ── Single send ─────────────────────────────────────────────────────

async function handleSingleSend(userId: string, req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { to, subject, htmlBody, senderName, senderEmail } = body

    if (!to || !subject || !htmlBody) {
      return jsonResponse({ error: 'Missing required fields: to, subject, htmlBody' }, 400)
    }

    const accessToken = await getValidToken(userId)
    if (!accessToken) {
      return jsonResponse({ error: 'Gmail not connected. Please authenticate first.', requiresAuth: true }, 400)
    }

    // Get sender's Gmail email if not provided
    let fromEmail = senderEmail
    if (!fromEmail) {
      const { data } = await supabase
        .from('user_google_tokens')
        .select('gmail_email')
        .eq('user_id', userId)
        .maybeSingle()
      fromEmail = data?.gmail_email || 'me'
    }

    const fromAddr = senderName ? `${senderName} <${fromEmail}>` : fromEmail
    const textBody = htmlToText(htmlBody)
    const raw = buildMimeMessage({ to, from: fromAddr, subject, htmlBody, textBody })
    const result = await sendGmailMessage(accessToken, raw)

    return jsonResponse({ success: true, messageId: result.id, threadId: result.threadId })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Send failed' }, 500)
  }
}

// ── Bulk send with NDJSON streaming ─────────────────────────────────

async function handleBulkSend(userId: string, req: Request): Promise<Response> {
  const body = await req.json()
  const {
    entryIds,
    subject,
    bodyTemplate,
    senderName,
    senderEmail,
    deckLinkUrl,
    deckLinkText,
  } = body as {
    entryIds: string[]
    subject: string
    bodyTemplate: string
    senderName: string
    senderEmail?: string
    deckLinkUrl?: string
    deckLinkText?: string
  }

  if (!entryIds?.length || !subject || !bodyTemplate) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  const accessToken = await getValidToken(userId)
  if (!accessToken) {
    return jsonResponse({ error: 'Gmail not connected', requiresAuth: true }, 400)
  }

  // Fetch Gmail address + signature
  const { data: tokenData } = await supabase
    .from('user_google_tokens')
    .select('gmail_email')
    .eq('user_id', userId)
    .maybeSingle()

  const gmailAddr = senderEmail || tokenData?.gmail_email || 'me'
  const signatureHtml = await getGmailSignature(accessToken, gmailAddr)

  // Fetch pipeline entries with artist data
  const { data: entries } = await supabase
    .from('pipeline_entries')
    .select('id, stage, artist:artists(id, name, email, spotify_url)')
    .in('id', entryIds)

  if (!entries?.length) {
    return jsonResponse({ error: 'No matching pipeline entries found' }, 400)
  }

  // Check excluded artists
  const { data: excluded } = await supabase.from('excluded_artists').select('email')
  const excludedEmails = new Set((excluded ?? []).map((e) => e.email?.toLowerCase()))

  // Check already-emailed
  const artistIds = entries.map((e) => (e.artist as { id: string })?.id).filter(Boolean)
  const { data: emailed } = await supabase
    .from('email_records')
    .select('recipient_email')
    .in('artist_id', artistIds)
    .eq('status', 'sent')
  const emailedSet = new Set((emailed ?? []).map((e) => e.recipient_email?.toLowerCase()))

  // Stream NDJSON response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: Record<string, unknown>): void => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }

      let sent = 0
      let failed = 0
      let skipped = 0
      const total = entries.length

      for (const entry of entries) {
        const artist = entry.artist as { id: string; name: string; email: string | null; spotify_url: string | null } | null
        if (!artist?.email) {
          skipped++
          write({ progress: sent + failed + skipped, total, sent, failed, skipped, current: artist?.name ?? 'Unknown', skipReason: 'No email' })
          continue
        }

        const email = artist.email.toLowerCase()

        if (excludedEmails.has(email)) {
          skipped++
          write({ progress: sent + failed + skipped, total, sent, failed, skipped, current: artist.name, skipReason: 'Excluded' })
          continue
        }

        if (emailedSet.has(email)) {
          skipped++
          write({ progress: sent + failed + skipped, total, sent, failed, skipped, current: artist.name, skipReason: 'Already emailed' })
          continue
        }

        try {
          const artistName = cleanArtistName(artist.name)
          const deckLink = deckLinkUrl && deckLinkText
            ? `<a href="${deckLinkUrl}">${deckLinkText}</a>`
            : deckLinkText || ''

          const personalizedBody = bodyTemplate
            .replace(/\{\{artistName\}\}/g, artistName)
            .replace(/\{\{deckLink\}\}/g, deckLink)
            .replace(/\{\{senderName\}\}/g, senderName || 'The Team')
            .replace(/\{\{spotifyUrl\}\}/g, artist.spotify_url || '')

          const personalizedSubject = subject
            .replace(/\{\{artistName\}\}/g, artistName)
            .replace(/\{\{senderName\}\}/g, senderName || 'The Team')

          // Build HTML with signature
          const bodyHtml = personalizedBody.replace(/\n/g, '<br>')
          const sigBlock = signatureHtml
            ? `<div><br></div><div class="gmail_signature" dir="ltr">${signatureHtml}</div>`
            : ''
          const htmlBody = `<div dir="ltr">${bodyHtml}${sigBlock}</div>`

          // Build plain text
          const textSig = signatureHtml
            ? '\n\n--\n' + htmlToText(signatureHtml)
            : ''
          const textBody = personalizedBody + textSig

          const fromAddr = senderName ? `${senderName} <${gmailAddr}>` : gmailAddr
          const raw = buildMimeMessage({
            to: artist.email,
            from: fromAddr,
            subject: personalizedSubject,
            htmlBody,
            textBody,
          })

          const result = await sendGmailMessage(accessToken, raw)

          // Record the send
          await supabase.from('email_records').insert({
            artist_id: artist.id,
            pipeline_entry_id: entry.id,
            recipient_email: artist.email,
            recipient_name: artist.name,
            subject: personalizedSubject,
            body: personalizedBody,
            status: 'sent',
            sent_at: new Date().toISOString(),
            gmail_message_id: result.id,
            gmail_thread_id: result.threadId,
            sender_email: gmailAddr,
            sender_name: senderName,
          })

          // Auto-move to 'contacted' if currently 'discovered'
          if (entry.stage === 'discovered') {
            await supabase.rpc('move_pipeline_stage', {
              entry_id: entry.id,
              new_stage: 'contacted',
              note: 'Bulk email sent via Gmail',
            })
          }

          sent++
          write({ progress: sent + failed + skipped, total, sent, failed, skipped, current: artist.name })

          // Rate limit: 500ms between sends
          if (sent + failed + skipped < total) {
            await new Promise((r) => setTimeout(r, 500))
          }
        } catch (err) {
          failed++

          // Record the failure
          await supabase.from('email_records').insert({
            artist_id: artist.id,
            pipeline_entry_id: entry.id,
            recipient_email: artist.email,
            recipient_name: artist.name,
            subject,
            body: bodyTemplate,
            status: 'failed',
            sender_email: gmailAddr,
            sender_name: senderName,
          })

          write({
            progress: sent + failed + skipped,
            total,
            sent,
            failed,
            skipped,
            current: artist.name,
            error: err instanceof Error ? err.message : 'Send failed',
          })
        }
      }

      write({ done: true, sent, failed, skipped, total })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
