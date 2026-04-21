import { useMemo } from 'react'
import { useEmailTemplates, renderTemplate, stripEmojis } from '@/hooks/useEmailTemplates'
import { Select } from '@/components/ui'
import type { PipelineEntry, Artist } from '@/types'
import type { StageFilter } from './bulkEmailTypes'
import { FILTERABLE_STAGES } from './bulkEmailTypes'

type BulkEmailComposeProps = {
  entries: (PipelineEntry & { artist: Artist })[]
  stageFilter: StageFilter
  setStageFilter: (stage: StageFilter) => void
  subject: string
  setSubject: (s: string) => void
  body: string
  setBody: (s: string) => void
  senderName: string
  setSenderName: (s: string) => void
  deckLinkUrl: string
  setDeckLinkUrl: (s: string) => void
  deckLinkText: string
  setDeckLinkText: (s: string) => void
  showPreview: boolean
  setShowPreview: (show: boolean) => void
  withEmail: (PipelineEntry & { artist: Artist })[]
  withoutEmail: (PipelineEntry & { artist: Artist })[]
}

function getTemplateVars(
  artist: Artist,
  deckLinkUrl: string,
  deckLinkText: string,
  senderName: string,
): Record<string, string> {
  const deckLink = deckLinkUrl
    ? `<a href="${deckLinkUrl}">${deckLinkText}</a>`
    : deckLinkText

  return {
    artistName: artist.name,
    mostRecentTrack: '',
    deckLink,
    senderName: senderName || 'The Team',
    spotifyUrl: artist.spotify_url ?? '',
  }
}

export function BulkEmailCompose({
  entries,
  stageFilter,
  setStageFilter,
  subject,
  setSubject,
  body,
  setBody,
  senderName,
  setSenderName,
  deckLinkUrl,
  setDeckLinkUrl,
  deckLinkText,
  setDeckLinkText,
  showPreview,
  setShowPreview,
  withEmail,
  withoutEmail,
}: BulkEmailComposeProps): React.JSX.Element {
  const { data: templates } = useEmailTemplates()

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length }
    entries.forEach((e) => {
      counts[e.stage] = (counts[e.stage] ?? 0) + 1
    })
    return counts
  }, [entries])

  function loadTemplate(templateId: string): void {
    const tmpl = templates?.find((t) => t.id === templateId)
    if (tmpl) {
      setSubject(tmpl.subject)
      setBody(tmpl.body)
    }
  }

  function getPreviewHtml(): string {
    if (withEmail.length === 0) return 'No recipients with email addresses.'
    const first = withEmail[0]!
    const vars = getTemplateVars(first.artist, deckLinkUrl, deckLinkText, senderName)
    const rendered = renderTemplate(body, vars)
    return stripEmojis(rendered).replace(/\n/g, '<br>')
  }

  // NOTE: dangerouslySetInnerHTML is used for email preview rendering.
  // Content comes from user-authored templates with variable substitution,
  // not from untrusted external sources. Consider DOMPurify for production.

  return (
    <>
      {/* Stage Filter */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Filter by Stage
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTERABLE_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage as StageFilter)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                stageFilter === stage
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {stage} ({stageCounts[stage] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Recipients summary */}
      <div className="mb-4 rounded-md bg-gray-50 p-3 text-sm">
        <span className="font-medium text-gray-700">{withEmail.length}</span>{' '}
        <span className="text-gray-500">recipients with email</span>
        {withoutEmail.length > 0 && (
          <span className="text-gray-400">
            {' '}({withoutEmail.length} without email will be skipped)
          </span>
        )}
      </div>

      {/* Template selector */}
      {templates && templates.length > 0 && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Load Template
          </label>
          <Select
            fullWidth
            value=""
            onChange={loadTemplate}
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Select template..."
          />
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
                    getTemplateVars(withEmail[0]!.artist, deckLinkUrl, deckLinkText, senderName),
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
  )
}
