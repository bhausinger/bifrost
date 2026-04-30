import { useState } from 'react'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import { Modal, Input, Label, Button, Select } from '@/components/ui'
import type { Artist } from '@/types'

export function NewCampaignModal({
  open,
  onClose,
  artists,
  createCampaign,
}: {
  open: boolean
  onClose: () => void
  artists: Artist[] | undefined
  createCampaign: ReturnType<typeof useCreateCampaign>
}) {
  const [artistId, setArtistId] = useState('')

  function handleClose() {
    onClose()
    setArtistId('')
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Campaign"
    >
      <form
        id="new-campaign-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!artistId) return
          const form = new FormData(e.currentTarget)
          const artist = artists?.find((a) => a.id === artistId)
          await createCampaign.mutateAsync({
            artist_id: artistId,
            name: (form.get('name') as string) || `${artist?.name ?? 'Unknown'} Campaign`,
            track_name: (form.get('track_name') as string) || undefined,
            track_spotify_url: (form.get('track_spotify_url') as string) || undefined,
            total_budget: form.get('total_budget') ? Number(form.get('total_budget')) : undefined,
          })
          handleClose()
        }}
        className="space-y-5"
      >
        <div>
          <Label htmlFor="nc-artist">Artist <span className="text-red-500 normal-case">*</span></Label>
          <Select
            fullWidth
            value={artistId}
            onChange={setArtistId}
            options={(artists ?? []).map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Select artist..."
          />
        </div>
        <div>
          <Label htmlFor="nc-name" optional>Campaign Name</Label>
          <Input id="nc-name" name="name" placeholder="Auto-generated if left blank" />
        </div>
        <div>
          <Label htmlFor="nc-track" optional>Track Name</Label>
          <Input id="nc-track" name="track_name" placeholder="e.g. Midnight Drive" />
        </div>
        <div>
          <Label htmlFor="nc-url" optional>Track Spotify URL</Label>
          <Input id="nc-url" name="track_spotify_url" type="url" placeholder="https://open.spotify.com/track/..." />
        </div>
        <div>
          <Label htmlFor="nc-budget" optional>Amount Paid</Label>
          <Input id="nc-budget" name="total_budget" type="number" step="0.01" placeholder="0.00" />
        </div>
        <div className="flex gap-3 pt-3">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createCampaign.isPending} className="flex-1">
            {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
