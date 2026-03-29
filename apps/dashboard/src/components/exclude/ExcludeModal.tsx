import { useState } from 'react'

const REASONS = [
  { value: 'opt_out', label: 'Asked to stop contacting' },
  { value: 'bounced', label: 'Email bounced' },
  { value: 'spam_report', label: 'Reported as spam' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'manual', label: 'Other' },
]

interface ExcludeModalProps {
  artistName: string
  onConfirm: (reason: string, notes: string) => void
  onCancel: () => void
}

export function ExcludeModal({
  artistName,
  onConfirm,
  onCancel,
}: ExcludeModalProps) {
  const [reason, setReason] = useState('opt_out')
  const [notes, setNotes] = useState('')

  return (
    <>
      <div className="modal-overlay" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
        <h3 className="mb-1 font-display text-lg font-semibold text-gray-900">
          Exclude {artistName}?
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          They will be removed from the pipeline and won't appear in future
          outreach.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="select-field w-full"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g., Replied on March 5 asking to stop"
            className="input-field w-full"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason, notes)}
            className="flex-1 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Exclude
          </button>
        </div>
      </div>
    </>
  )
}
