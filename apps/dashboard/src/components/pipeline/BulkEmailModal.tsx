import { useState, useMemo } from 'react'
import type { BulkEmailModalProps, StageFilter } from './bulkEmailTypes'
import { DEFAULT_SUBJECT, DEFAULT_BODY } from './bulkEmailTypes'
import { useBulkEmailSend } from './useBulkEmailSend'
import { BulkEmailCompose } from './BulkEmailCompose'
import { BulkEmailSending, BulkEmailDone } from './BulkEmailProgress'

export function BulkEmailModal({ entries, onClose }: BulkEmailModalProps): React.JSX.Element {
  const [stageFilter, setStageFilter] = useState<StageFilter>('discovered')
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [deckLinkUrl, setDeckLinkUrl] = useState('')
  const [deckLinkText, setDeckLinkText] = useState('1,000-10,000+ streams')
  const [senderName, setSenderName] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const filteredEntries = useMemo(() => {
    if (stageFilter === 'all') return entries
    return entries.filter((e) => e.stage === stageFilter)
  }, [entries, stageFilter])

  const withEmail = filteredEntries.filter((e) => e.artist.email)
  const withoutEmail = filteredEntries.filter((e) => !e.artist.email)

  const { sendStatus, progress, handleSend } = useBulkEmailSend({
    entries: filteredEntries,
    subject,
    body,
    senderName,
    deckLinkUrl,
    deckLinkText,
  })

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
            <BulkEmailCompose
              entries={entries}
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              subject={subject}
              setSubject={setSubject}
              body={body}
              setBody={setBody}
              senderName={senderName}
              setSenderName={setSenderName}
              deckLinkUrl={deckLinkUrl}
              setDeckLinkUrl={setDeckLinkUrl}
              deckLinkText={deckLinkText}
              setDeckLinkText={setDeckLinkText}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
              withEmail={withEmail}
              withoutEmail={withoutEmail}
            />
          )}
          {sendStatus === 'sending' && <BulkEmailSending progress={progress} />}
          {sendStatus === 'done' && <BulkEmailDone progress={progress} />}
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
