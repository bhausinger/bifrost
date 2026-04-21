import { useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { useEmailTemplates, renderTemplate, stripEmojis } from '@/hooks/useEmailTemplates'
import { Select } from '@/components/ui'
import type { PipelineEntry, Artist } from '@/types'

type Activity = {
  id: string
  description: string
  created_at: string
  type: string
}

type PipelineDetailEmailsProps = {
  entry: PipelineEntry & { artist: Artist }
  sentEmails: Activity[]
}

export function PipelineDetailEmails({ entry, sentEmails }: PipelineDetailEmailsProps): JSX.Element {
  const { data: templates } = useEmailTemplates()

  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ success: boolean; error?: string } | null>(null)

  function initEmailDraft(): void {
    if (!emailSubject) {
      setEmailSubject(`Spotify Playlist Placement - ${entry.artist.name}`)
      setEmailBody(`Hi ${stripEmojis(entry.artist.name)},\n\n\n\nBest,\n`)
    }
  }

  function loadTemplateIntoEmail(templateId: string): void {
    const tmpl = templates?.find((t) => t.id === templateId)
    if (!tmpl) return
    const vars: Record<string, string> = {
      artistName: entry.artist.name,
      senderName: '',
      deckLink: '',
      spotifyUrl: entry.artist.spotify_url ?? '',
    }
    setEmailSubject(renderTemplate(tmpl.subject, vars))
    setEmailBody(renderTemplate(tmpl.body, vars))
  }

  async function handleSendEmail(): Promise<void> {
    if (!entry.artist.email || !emailSubject || !emailBody) return
    setEmailSending(true)
    setEmailResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/gmail-send/single`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to: entry.artist.email,
          subject: emailSubject,
          htmlBody: stripEmojis(emailBody).replace(/\n/g, '<br>'),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')

      await supabase.from('email_records').insert({
        artist_id: entry.artist_id,
        pipeline_entry_id: entry.id,
        recipient_email: entry.artist.email,
        recipient_name: entry.artist.name,
        subject: emailSubject,
        body: emailBody,
        status: 'sent',
        sent_at: new Date().toISOString(),
        gmail_message_id: data.messageId,
        gmail_thread_id: data.threadId,
      })

      if (entry.stage === 'discovered') {
        await supabase.rpc('move_pipeline_stage', {
          entry_id: entry.id,
          new_stage: 'contacted',
          note: 'Email sent via Gmail',
        })
      }

      setEmailResult({ success: true })
    } catch (err) {
      setEmailResult({ success: false, error: err instanceof Error ? err.message : 'Unknown error' })
    }
    setEmailSending(false)
  }

  return (
    <div className="space-y-4">
      {!entry.artist.email && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
          No email address on file. Add one in the Edit tab.
        </div>
      )}

      {entry.artist.email && (
        <>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="text-xs text-gray-500">
              To: <span className="text-gray-900">{entry.artist.email}</span>
            </div>

            {templates && templates.length > 0 && (
              <Select
                fullWidth
                value=""
                options={templates.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Load template..."
                onChange={loadTemplateIntoEmail}
              />
            )}

            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              onFocus={initEmailDraft}
              placeholder="Subject"
              className="input-field w-full text-sm"
            />
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              onFocus={initEmailDraft}
              rows={8}
              placeholder="Write your message..."
              className="input-field w-full text-sm font-mono"
            />

            {emailResult && (
              <div className={`rounded px-2 py-1.5 text-xs ${emailResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {emailResult.success ? 'Email sent!' : emailResult.error}
              </div>
            )}

            <button
              onClick={handleSendEmail}
              disabled={emailSending || !emailSubject || !emailBody}
              className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {emailSending ? 'Sending...' : 'Send'}
            </button>
          </div>

          {sentEmails.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Email History</h3>
              <div className="space-y-2">
                {sentEmails.map((a) => (
                  <div key={a.id} className="border-l-2 border-teal-200 pl-3">
                    <div className="text-sm text-gray-700">{a.description}</div>
                    <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
