import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { buildDeckLink, cleanArtistName, htmlToText, personalizeTemplate } from './helpers.ts'

const RESEND_API_URL = 'https://api.resend.com/emails'
const RATE_LIMIT_MS = 500

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://bifrost-eta.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Resend API ──────────────────────────────────────────────────────

async function sendViaResend(opts: {
  to: string
  from: string
  subject: string
  html: string
  text: string
}): Promise<{ id: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend API error ${res.status}: ${errBody}`)
  }

  const data: { id: string } = await res.json()
  return { id: data.id }
}

// ── Auth helper ─────────────────────────────────────────────────────

async function getUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
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

    if (path === 'single') {
      return await handleSingleSend(req)
    }

    if (path === 'bulk') {
      return await handleBulkSend(req)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      500,
    )
  }
})

// ── Single send ─────────────────────────────────────────────────────

async function handleSingleSend(req: Request): Promise<Response> {
  const body = await req.json()
  const { to, subject, htmlBody, senderName, senderEmail } = body as {
    to: string
    subject: string
    htmlBody: string
    senderName?: string
    senderEmail?: string
  }

  if (!to || !subject || !htmlBody) {
    return jsonResponse({ error: 'Missing required fields: to, subject, htmlBody' }, 400)
  }

  if (!senderEmail) {
    return jsonResponse({ error: 'Missing required field: senderEmail' }, 400)
  }

  const fromAddr = senderName ? `${senderName} <${senderEmail}>` : senderEmail
  const textBody = htmlToText(htmlBody)

  const result = await sendViaResend({
    to,
    from: fromAddr,
    subject,
    html: htmlBody,
    text: textBody,
  })

  return jsonResponse({ success: true, messageId: result.id })
}

// ── Bulk send with NDJSON streaming ─────────────────────────────────

type ArtistData = {
  id: string
  name: string
  email: string | null
  spotify_url: string | null
}

type PipelineEntry = {
  id: string
  stage: string
  artist: ArtistData | null
}

async function handleBulkSend(req: Request): Promise<Response> {
  const body = await req.json()
  const { entryIds, subject, bodyTemplate, senderName, senderEmail, deckLinkUrl, deckLinkText } =
    body as {
      entryIds: string[]
      subject: string
      bodyTemplate: string
      senderName: string
      senderEmail: string
      deckLinkUrl?: string
      deckLinkText?: string
    }

  if (!entryIds?.length || !subject || !bodyTemplate) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  if (!senderEmail) {
    return jsonResponse({ error: 'Missing required field: senderEmail' }, 400)
  }

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
  const excludedEmails = new Set(
    (excluded ?? []).map((e: { email: string | null }) => e.email?.toLowerCase()),
  )

  // Check already-emailed artists
  const artistIds = (entries as PipelineEntry[])
    .map((e) => e.artist?.id)
    .filter((id): id is string => Boolean(id))
  const { data: emailed } = await supabase
    .from('email_records')
    .select('recipient_email')
    .in('artist_id', artistIds)
    .eq('status', 'sent')
  const emailedSet = new Set(
    (emailed ?? []).map((e: { recipient_email: string | null }) =>
      e.recipient_email?.toLowerCase(),
    ),
  )

  const fromAddr = senderName ? `${senderName} <${senderEmail}>` : senderEmail
  const deckLink = buildDeckLink(deckLinkUrl, deckLinkText)

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

      for (const rawEntry of entries) {
        const entry = rawEntry as PipelineEntry
        const artist = entry.artist

        if (!artist?.email) {
          skipped++
          write({
            progress: sent + failed + skipped,
            total,
            sent,
            failed,
            skipped,
            current: artist?.name ?? 'Unknown',
            skipReason: 'No email',
          })
          continue
        }

        const email = artist.email.toLowerCase()

        if (excludedEmails.has(email)) {
          skipped++
          write({
            progress: sent + failed + skipped,
            total,
            sent,
            failed,
            skipped,
            current: artist.name,
            skipReason: 'Excluded',
          })
          continue
        }

        if (emailedSet.has(email)) {
          skipped++
          write({
            progress: sent + failed + skipped,
            total,
            sent,
            failed,
            skipped,
            current: artist.name,
            skipReason: 'Already emailed',
          })
          continue
        }

        try {
          const artistName = cleanArtistName(artist.name)

          const personalizedBody = personalizeTemplate(bodyTemplate, {
            artistName,
            deckLink,
            senderName: senderName || 'The Team',
            spotifyUrl: artist.spotify_url || '',
          })

          const personalizedSubject = personalizeTemplate(subject, {
            artistName,
            deckLink: '',
            senderName: senderName || 'The Team',
            spotifyUrl: '',
          })

          const htmlBody = `<div dir="ltr">${personalizedBody.replace(/\n/g, '<br>')}</div>`
          const textBody = htmlToText(personalizedBody)

          const result = await sendViaResend({
            to: artist.email,
            from: fromAddr,
            subject: personalizedSubject,
            html: htmlBody,
            text: textBody,
          })

          await supabase.from('email_records').insert({
            artist_id: artist.id,
            pipeline_entry_id: entry.id,
            recipient_email: artist.email,
            recipient_name: artist.name,
            subject: personalizedSubject,
            body: personalizedBody,
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_message_id: result.id,
            sender_email: senderEmail,
            sender_name: senderName,
          })

          // Auto-move to 'contacted' if currently 'discovered'
          if (entry.stage === 'discovered') {
            await supabase.rpc('move_pipeline_stage', {
              entry_id: entry.id,
              new_stage: 'contacted',
              note: 'Bulk email sent via Resend',
            })
          }

          sent++
          write({
            progress: sent + failed + skipped,
            total,
            sent,
            failed,
            skipped,
            current: artist.name,
          })

          // Rate limit between sends
          if (sent + failed + skipped < total) {
            await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
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
            sender_email: senderEmail,
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
