import { useState } from 'react'
import { Select, Modal, Button, Textarea, Label } from '@/components/ui'

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
    <Modal
      open
      onClose={onCancel}
      title={`Exclude ${artistName}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason, notes)}>Exclude</Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        They will be removed from the pipeline and won't appear in future outreach.
      </p>

      <div className="mb-4">
        <Label>Reason</Label>
        <Select fullWidth value={reason} onChange={setReason} options={REASONS} />
      </div>

      <div>
        <Label optional>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g., Replied on March 5 asking to stop"
        />
      </div>
    </Modal>
  )
}
