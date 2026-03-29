import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmailTemplates, renderTemplate, stripEmojis } from '@/hooks/useEmailTemplates'
import type { PipelineEntry, Artist, PipelineStage } from '@/types'

interface BulkEmailModalProps {
  entries: (PipelineEntry & { artist: Artist })[]
  onClose: () => void
}

type SendStatus = 'idle' | 'sending' | 'done'

interface SendProgress {
  total: number
  sent: number
  failed: number
  skipped: number
  current: string
  errors: { artist: string; error: string }[]
  skippedList: { artist: string; reason: string }[]
}

type StageFilter = 'all' | PipelineStage

const DEFAULT_SUBJECT = 'Spotify Playlist Placement Opportunity'
const DEFAULT_BODY = `Hi {{artistName}},

I came across your music and think it would be a great fit for some of our curated Spotify playlists.

We work with playlist curators across multiple genres to get artists real, organic streams. Our placements typically see {{deckLink}} within the first month.

Would you be interested in learning more about our placement packages?

Best,
{{senderName}}`

export function BulkEmailModal({ entries, onClose }: BulkEmailModalProps) {
  const { data: templates } = useEmailTemplates()
  const [stageFilter, setStageFilter] = useState<StageFilter>('discovered')
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [deckLinkUrl, setDeckLinkUrl] = useState('')
  const [deckLinkText, setDeckLinkText] = useState('1,000-10,000+ streams')
  const [senderName, setSenderName] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [progress, setProgress] = useState<SendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    current: '',
    errors: [],
    skippedList: [],
  })

  // Filter entries by stage and email availability
  const filteredEntries = useMemo(() => {
    let filtered = entries
    if (stageFilter !== 'all') {
      filtered = filtered.filter((e) => e.stage === stageFilter)
    }
    return filtered
  }, [entries, stageFilter])

  const withEmail = filteredEntries.filter((e) => e.artist.email)
  const withoutEmail = filteredEntries.filter((e) => !e.artist.email)

  // Count entries per stage for the filter
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length }
    entries.forEach((e) => {
      counts[e.stage] = (counts[e.stage] ?? 0) + 1
    })
    return counts
  }, [entries])

  function getTemplateVars(artist: Artist): Record<string, string> {
    const deckLink = deckLinkUrl
      ? `<a href="${deckLinkUrl}">${deckLinkText}</a>`
      : deckLinkText

    return {
      artistName: artist.name,
      mostRecentTrack: '', // TODO: populate from Spotify API
      deckLink,
      senderName: senderName || 'The Team',
      spotifyUrl: artist.spotify_url ?? '',
    }
  }

  function getPreviewHtml(): string {
    if (withEmail.length === 0) return 'No recipients with email addresses.'
    const first = withEmail[0]!
    const vars = getTemplateVars(first.artist)
    const rendered = renderTemplate(body, vars)
    return stripEmojis(rendered).replace(/\n/g, '<br>')
  }

  async function handleSend() {
    if (withEmail.length === 0) return

    setSendStatus('sending')
    const total = withEmail.length
    const newProgress: SendProgress = {
      total,
      sent: 0,
      failed: 0,
      skipped: 0,
      current: '',
      errors: [],
      skippedList: [],
    }
    setProgress(newProgress)

    // Check excluded list
    const { data: excluded } = await supabase
      .from('excluded_artists')
      .select('email')
    const excludedEmails = new Set(
      (excluded ?? []).map((e) => e.email?.toLowerCase())
    )

    // Check already-emailed (email_records)
    const { data: emailed } = await supabase
      .from('email_records')
      .select('recipient_email')
    const emailedSet = new Set(
      (emailed ?? []).map((e) => e.recipient_email?.toLowerCase())
    )

    for (const entry of withEmail) {
      const email = entry.artist.email!.toLowerCase()
      newProgress.current = entry.artist.name

      // Check exclusion
      if (excludedEmails.has(email)) {
        newProgress.skipped++
        newProgress.skippedList.push({
          artist: entry.artist.name,
          reason: 'Excluded',
        })
        setProgress({ ...newProgress })
        continue
      }

      // Check already emailed
      if (emailedSet.has(email)) {
        newProgress.skipped++
        newProgress.skippedList.push({
          artist: entry.artist.name,
          reason: 'Already emailed',
        })
        setProgress({ ...newProgress })
        continue
      }

      // Render the template
      const vars = getTemplateVars(entry.artist)
      const renderedSubject = renderTemplate(subject, vars)
      const renderedBody = stripEmojis(renderTemplate(body, vars))

      try {
        // Record the email in the database
        // In production, this would call a Supabase Edge Function that sends via Gmail API
        const { error } = await supabase.from('email_records').insert({
          pipeline_entry_id: entry.id,
          recipient_email: entry.artist.email,
          recipient_name: entry.artist.name,
          subject: renderedSubject,
          body: renderedBody,
          status: 'queued',
          template_id: null,
        })

        if (error) throw error

        // Move to 'contacted' stage if currently 'discovered'
        if (entry.stage === 'discovered') {
          await supabase.rpc('move_pipeline_stage', {
            entry_id: entry.id,
            new_stage: 'contacted',
            note: 'Bulk email sent',
          })
        }

        newProgress.sent++
      } catch (err) {
        newProgress.failed++
        newProgress.errors.push({
          artist: entry.artist.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      setProgress({ ...newProgress })

      // Rate limit: 500ms between sends
      await new Promise((r) => setTimeout(r, 500))
    }

    newProgress.current = ''
    setProgress({ ...newProgress })
    setSendStatus('done')
  }

  function loadTemplate(templateId: string) {
    const tmpl = templates?.find((t) => t.id === templateId)
    if (tmpl) {
      setSubject(tmpl.subject)
      setBody(tmpl.body)
    }
  }

  // NOTE: dangerouslySetInnerHTML is used below for email preview rendering.
  // The content comes from user-authored templates with variable substitution
  // (renderTemplate + stripEmojis), not from untrusted external sources.
  // In a production environment, consider adding DOMPurify sanitization.

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-panel fixed inset-4 z-50 mx-auto flex max-w-3xl flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-gray-900">Bulk Email</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {sendStatus === 'idle' && (
            <>
              {/* Stage Filter */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Filter by Stage
                </label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'discovered', 'contacted', 'responded', 'follow_up'].map(
                    (stage) => (
                      <button
                        key={stage}
                        onClick={() => setStageFilter(stage as StageFilter)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          stageFilter === stage
                            ? 'bg-gray-900 text-gray-900'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {stage} ({stageCounts[stage] ?? 0})
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Recipients summary */}
              <div className="mb-4 rounded-md bg-gray-50 p-3 text-sm">
                <span className="font-medium text-gray-700">
                  {withEmail.length}
                </span>{' '}
                <span className="text-gray-500">recipients with email</span>
                {withoutEmail.length > 0 && (
                  <span className="text-gray-400">
                    {' '}
                    ({withoutEmail.length} without email will be skipped)
                  </span>
                )}
              </div>

              {/* Template selector */}
              {templates && templates.length > 0 && (
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Load Template
                  </label>
                  <select
                    onChange={(e) => loadTemplate(e.target.value)}
                    className="select-field w-full"
                    defaultValue=""
                  >
                    <option value="">Select template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sender name */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your name"
                  className="input-field w-full"
                />
              </div>

              {/* Deck link */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Deck Link URL (optional)
                  </label>
                  <input
                    type="url"
                    value={deckLinkUrl}
                    onChange={(e) => setDeckLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Deck Link Text
                  </label>
                  <input
                    type="text"
                    value={deckLinkText}
                    onChange={(e) => setDeckLinkText(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-field w-full"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Variables: {'{{artistName}}'}, {'{{mostRecentTrack}}'},{' '}
                  {'{{senderName}}'}
                </p>
              </div>

              {/* Body */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="input-field w-full font-mono"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Variables: {'{{artistName}}'}, {'{{deckLink}}'},{' '}
                  {'{{senderName}}'}, {'{{spotifyUrl}}'}. Gmail signature will
                  be auto-appended.
                </p>
              </div>

              {/* Preview toggle */}
              <div className="mb-4">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm font-medium text-amber-600 hover:text-amber-300"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                {showPreview && (
                  <div className="mt-2 rounded-lg border border-gray-300 bg-gray-50 p-4">
                    <div className="mb-2 text-sm font-medium text-gray-400">
                      Preview (first recipient:{' '}
                      {withEmail[0]?.artist.name ?? 'none'})
                    </div>
                    <div className="mb-2 text-sm text-gray-700">
                      <span className="text-gray-400">Subject: </span>
                      {withEmail.length > 0
                        ? renderTemplate(
                            subject,
                            getTemplateVars(withEmail[0]!.artist)
                          )
                        : subject}
                    </div>
                    <div
                      className="text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Sending progress */}
          {sendStatus === 'sending' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mb-2 text-sm text-gray-500">
                  Sending to {progress.current}...
                </div>
                <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${((progress.sent + progress.failed + progress.skipped) / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-center gap-4 text-sm font-mono">
                  <span className="text-emerald-600">
                    {progress.sent} sent
                  </span>
                  <span className="text-amber-600">
                    {progress.skipped} skipped
                  </span>
                  <span className="text-red-600">
                    {progress.failed} failed
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Done */}
          {sendStatus === 'done' && (
            <div className="space-y-4">
              <div className="rounded-md bg-emerald-50 p-4 text-center">
                <div className="font-display text-lg font-medium text-emerald-600">
                  Bulk email complete
                </div>
                <div className="mt-2 flex justify-center gap-6 text-sm font-mono">
                  <span className="text-emerald-600">
                    {progress.sent} sent
                  </span>
                  <span className="text-amber-600">
                    {progress.skipped} skipped
                  </span>
                  <span className="text-red-600">
                    {progress.failed} failed
                  </span>
                </div>
              </div>

              {progress.skippedList.length > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-500">
                    Skipped ({progress.skippedList.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto rounded border border-gray-300 text-sm">
                    {progress.skippedList.map((s, i) => (
                      <div
                        key={i}
                        className="flex justify-between border-b border-gray-200 px-3 py-1.5 last:border-0"
                      >
                        <span className="text-gray-700">{s.artist}</span>
                        <span className="text-gray-400">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {progress.errors.length > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-red-600">
                    Errors ({progress.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto rounded border border-red-500/20 text-sm">
                    {progress.errors.map((e, i) => (
                      <div
                        key={i}
                        className="flex justify-between border-b border-red-500/10 px-3 py-1.5 last:border-0"
                      >
                        <span className="text-gray-700">{e.artist}</span>
                        <span className="text-red-600">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {sendStatus === 'done' ? 'Close' : 'Cancel'}
          </button>
          {sendStatus === 'idle' && (
            <button
              onClick={handleSend}
              disabled={withEmail.length === 0}
              className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send to {withEmail.length} artists
            </button>
          )}
        </div>
      </div>
    </>
  )
}
