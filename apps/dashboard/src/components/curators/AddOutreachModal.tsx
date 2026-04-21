import { useState } from 'react'
import { Input, Select, Label, Modal, Button } from '@/components/ui'
import type { CuratorOutreach } from '@/types'

type AddOutreachModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (entry: Partial<CuratorOutreach>) => void
  isSubmitting: boolean
}

export function AddOutreachModal({ open, onClose, onSubmit, isSubmitting }: AddOutreachModalProps) {
  const [playlist, setPlaylist] = useState('')
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [genre, setGenre] = useState('')
  const [organic, setOrganic] = useState('')
  const [price, setPrice] = useState('')

  function handleSubmit(): void {
    if (!playlist) return
    onSubmit({
      playlist_name: playlist,
      playlist_url: url || null,
      email: email || null,
      genre: genre || null,
      is_organic: organic === '' ? null : organic === 'yes',
      price_per_10k: price ? parseFloat(price) : null,
    })
    setPlaylist(''); setUrl(''); setEmail(''); setGenre(''); setOrganic(''); setPrice('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Playlist to Track"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!playlist || isSubmitting}>Add Playlist</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Playlist Name *</Label>
          <Input type="text" value={playlist} onChange={(e) => setPlaylist(e.target.value)} placeholder="e.g., Bass Nation" />
        </div>
        <div>
          <Label optional>Playlist URL</Label>
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label optional>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@email.com" />
          </div>
          <div>
            <Label optional>Genre</Label>
            <Input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g., EDM, Bass, Rap" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label optional>Organic?</Label>
            <Select
              value={organic}
              onChange={setOrganic}
              fullWidth
              placeholder="Unknown"
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </div>
          <div>
            <Label optional>Price per 10K</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" step="0.01" />
          </div>
        </div>
      </div>
    </Modal>
  )
}
