import { useState } from 'react'
import { Modal, Button, Input, Label, Select } from '@/components/ui'
import type { Agency } from '@/types'
import type { useCreateArtist } from '@/hooks/useArtists'
import type { useCreateAgency } from '@/hooks/useAgencies'

const CREATE_NEW_VALUE = '__create_new__'

type AddArtistModalProps = {
  open: boolean
  onClose: () => void
  createArtist: ReturnType<typeof useCreateArtist>
  agencies: Agency[]
  createAgency: ReturnType<typeof useCreateAgency>
}

export function AddArtistModal({
  open,
  onClose,
  createArtist,
  agencies,
  createAgency,
}: AddArtistModalProps): JSX.Element | null {
  const [selectedAgencyId, setSelectedAgencyId] = useState('')
  const [newAgencyName, setNewAgencyName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCreatingNew = selectedAgencyId === CREATE_NEW_VALUE

  function handleClose(): void {
    setSelectedAgencyId('')
    setNewAgencyName('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let agencyId: string | null = null

      if (isCreatingNew && newAgencyName.trim()) {
        const newAgency = await createAgency.mutateAsync({ name: newAgencyName.trim() })
        agencyId = newAgency.id
      } else if (selectedAgencyId && !isCreatingNew) {
        agencyId = selectedAgencyId
      }

      const form = new FormData(e.currentTarget)
      await createArtist.mutateAsync({
        name: form.get('name') as string,
        email: (form.get('email') as string) || null,
        spotify_url: (form.get('spotify_url') as string) || null,
        genres: (form.get('genres') as string)
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean),
        source: 'manual',
        status: 'client',
        agency_id: agencyId,
      })
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Artist">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="add-name">
            Artist Name <span className="text-red-500 normal-case">*</span>
          </Label>
          <Input id="add-name" name="name" placeholder="e.g. Tame Impala" required />
        </div>
        <div>
          <Label htmlFor="add-email" optional>
            Email
          </Label>
          <Input id="add-email" name="email" type="email" placeholder="artist@example.com" />
        </div>
        <div>
          <Label htmlFor="add-spotify" optional>
            Spotify URL
          </Label>
          <Input
            id="add-spotify"
            name="spotify_url"
            type="url"
            pattern="https://open\.spotify\.com/artist/.*"
            title="Must be a Spotify artist URL (https://open.spotify.com/artist/...)"
            placeholder="https://open.spotify.com/artist/..."
          />
        </div>
        <div>
          <Label htmlFor="add-genres" optional>
            Genres
          </Label>
          <Input id="add-genres" name="genres" placeholder="indie, electronic, dream pop" />
        </div>

        <div>
          <Label htmlFor="add-agency" optional>
            Agency
          </Label>
          <Select
            fullWidth
            value={selectedAgencyId}
            onChange={(v) => {
              setSelectedAgencyId(v)
              if (v !== CREATE_NEW_VALUE) setNewAgencyName('')
            }}
            options={[
              { value: '', label: 'No agency' },
              ...agencies.map((a) => ({ value: a.id, label: a.name })),
              { value: CREATE_NEW_VALUE, label: '+ Create New...' },
            ]}
            placeholder="Select agency..."
          />
          {isCreatingNew && (
            <Input
              value={newAgencyName}
              onChange={(e) => setNewAgencyName(e.target.value)}
              placeholder="New agency name"
              className="mt-2"
              autoFocus
            />
          )}
        </div>

        <div className="flex gap-3 pt-3">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Adding...' : 'Add Artist'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
