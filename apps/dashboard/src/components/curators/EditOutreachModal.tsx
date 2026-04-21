import { useState } from 'react'
import { Input, Textarea, Select, Label, Modal, Button } from '@/components/ui'
import type { CuratorOutreach } from '@/types'

type EditOutreachModalProps = {
  entry: CuratorOutreach
  onClose: () => void
  onSave: (updates: Partial<CuratorOutreach>) => void
}

export function EditOutreachModal({ entry, onClose, onSave }: EditOutreachModalProps) {
  const [name, setName] = useState(entry.playlist_name)
  const [url, setUrl] = useState(entry.playlist_url ?? '')
  const [email, setEmail] = useState(entry.email ?? '')
  const [genre, setGenre] = useState(entry.genre ?? '')
  const [organic, setOrganic] = useState(entry.is_organic === true ? 'yes' : entry.is_organic === false ? 'no' : '')
  const [price, setPrice] = useState(entry.price_per_10k?.toString() ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')

  return (
    <Modal open onClose={onClose} title="Edit Playlist" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={() => onSave({
        playlist_name: name,
        playlist_url: url || null,
        email: email || null,
        genre: genre || null,
        is_organic: organic === '' ? null : organic === 'yes',
        price_per_10k: price ? Number(price) : null,
        notes: notes || null,
      })}>Save Changes</Button>
    </>}>
      <div className="space-y-4">
        <div>
          <Label>Playlist Name *</Label>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Playlist URL</Label>
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Genre</Label>
            <Input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Organic?</Label>
            <Select
              value={organic}
              onChange={setOrganic}
              fullWidth
              options={[
                { value: '', label: 'Unknown' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </div>
          <div>
            <Label>Price per 10K</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} step="0.01" />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
