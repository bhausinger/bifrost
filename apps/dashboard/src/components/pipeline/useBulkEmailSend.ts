import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import type { PipelineEntry, Artist } from '@/types'
import type { SendStatus, SendProgress } from './bulkEmailTypes'
import { INITIAL_PROGRESS } from './bulkEmailTypes'

type BulkEmailPayload = {
  entries: (PipelineEntry & { artist: Artist })[]
  subject: string
  body: string
  senderName: string
  deckLinkUrl: string
  deckLinkText: string
}

type BulkEmailSendResult = {
  sendStatus: SendStatus
  progress: SendProgress
  handleSend: () => Promise<void>
}

export function useBulkEmailSend(payload: BulkEmailPayload): BulkEmailSendResult {
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [progress, setProgress] = useState<SendProgress>({ ...INITIAL_PROGRESS })

  async function handleSend(): Promise<void> {
    const withEmail = payload.entries.filter((e) => e.artist.email)
    if (withEmail.length === 0) return

    setSendStatus('sending')
    const total = withEmail.length
    const newProgress: SendProgress = { ...INITIAL_PROGRESS, total, errors: [], skippedList: [] }
    setProgress(newProgress)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        newProgress.errors.push({ artist: '', error: 'Not authenticated' })
        setProgress({ ...newProgress })
        setSendStatus('done')
        return
      }

      const entryIds = withEmail.map((e) => e.id)

      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/gmail-send/bulk`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            entryIds,
            subject: payload.subject,
            bodyTemplate: payload.body,
            senderName: payload.senderName || 'The Team',
            deckLinkUrl: payload.deckLinkUrl || undefined,
            deckLinkText: payload.deckLinkText || undefined,
          }),
        },
      )

      if (!response.ok) {
        const err = await response.json()
        if (err.requiresAuth) {
          newProgress.errors.push({
            artist: '',
            error: 'Gmail not connected. Go to Settings to connect your Gmail account.',
          })
          setProgress({ ...newProgress })
          setSendStatus('done')
          return
        }
        throw new Error(err.error || 'Send failed')
      }

      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/x-ndjson') && response.body) {
        await processNdjsonStream(response.body, newProgress, setProgress)
      } else {
        const result = await response.json()
        if (!result.success) {
          newProgress.errors.push({ artist: '', error: result.error || 'Unknown error' })
        }
        setProgress({ ...newProgress })
      }
    } catch (err) {
      newProgress.errors.push({
        artist: '',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      setProgress({ ...newProgress })
    }

    setSendStatus('done')
  }

  return { sendStatus, progress, handleSend }
}

async function processNdjsonStream(
  body: ReadableStream<Uint8Array>,
  newProgress: SendProgress,
  setProgress: (p: SendProgress) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        if (data.done) {
          newProgress.sent = data.sent ?? 0
          newProgress.failed = data.failed ?? 0
          newProgress.skipped = data.skipped ?? 0
          newProgress.current = ''
        } else {
          newProgress.sent = data.sent ?? newProgress.sent
          newProgress.failed = data.failed ?? newProgress.failed
          newProgress.skipped = data.skipped ?? newProgress.skipped
          newProgress.current = data.current ?? ''
          if (data.skipReason) {
            newProgress.skippedList.push({
              artist: data.current ?? 'Unknown',
              reason: data.skipReason,
            })
          }
          if (data.error) {
            newProgress.errors.push({
              artist: data.current ?? 'Unknown',
              error: data.error,
            })
          }
        }
        setProgress({ ...newProgress })
      } catch {
        // skip malformed NDJSON lines
      }
    }
  }
}
