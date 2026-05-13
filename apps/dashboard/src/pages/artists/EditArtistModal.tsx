import { useState } from 'react'
import { Modal, Button, Input, Label, Select, MultiSelect } from '@/components/ui'
import { GENRE_OPTIONS } from './genreOptions'
import type { Artist, Agency } from '@/types'
import type { useUpdateArtist } from '@/hooks/useArtists'
import type { useCreateAgency } from '@/hooks/useAgencies'

const CREATE_NEW_VALUE = '__create_new__'

type EditArtistModalProps = {
  artist: Artist
  agencies: Agency[]
  onClose: () => void
  updateArtist: ReturnType<typeof useUpdateArtist>
  createAgency: ReturnType<typeof useCreateAgency>
}

export function EditArtistModal({
  artist,
  agencies,
  onClose,
  updateArtist,
  createAgency,
}: EditArtistModalProps): JSX.Element {
  const [selectedAgencyId, setSelectedAgencyId] = useState(artist.agency?.id ?? '')
  const [newAgencyName, setNewAgencyName] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(artist.genres ?? [])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCreatingNew = selectedAgencyId === CREATE_NEW_VALUE

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
      await updateArtist.mutateAsync({
        id: artist.id,
        name: (form.get('name') as string).trim(),
        email: (form.get('email') as string).trim() || null,
        spotify_url: (form.get('spotify_url') as string).trim() || null,
        genres: selectedGenres,
        agency_id: agencyId,
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit Artist">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="edit-name">
            Artist Name <span className="text-red-500 normal-case">*</span>
          </Label>
          <Input id="edit-name" name="name" defaultValue={artist.name} required />
        </div>
        <div>
          <Label htmlFor="edit-email" optional>
            Email
          </Label>
          <Input id="edit-email" name="email" type="email" defaultValue={artist.email ?? ''} />
        </div>
        <div>
          <Label htmlFor="edit-spotify" optional>
            Spotify URL
          </Label>
          <Input
            id="edit-spotify"
            name="spotify_url"
            type="url"
            pattern="https://open\.spotify\.com/artist/.*"
            title="Must be a Spotify artist URL"
            defaultValue={artist.spotify_url ?? ''}
          />
        </div>
        <div>
          <Label htmlFor="edit-genres" optional>
            Genres
          </Label>
          <MultiSelect
            id="edit-genres"
            values={selectedGenres}
            onChange={setSelectedGenres}
            options={[...GENRE_OPTIONS]}
            placeholder="Search genres..."
            fullWidth
          />
        </div>
        <div>
          <Label htmlFor="edit-agency" optional>
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
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
