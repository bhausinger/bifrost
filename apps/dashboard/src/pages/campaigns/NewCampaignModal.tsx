import { useState } from 'react'
import { Music2 } from 'lucide-react'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import { useSpotifyTrack } from '@/hooks/useSpotifyTrack'
import { Modal, Input, Label, Button, SearchSelect } from '@/components/ui'
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
}): JSX.Element {
  const [artistId, setArtistId] = useState('')
  const [trackUrl, setTrackUrl] = useState('')
  const [trackName, setTrackName] = useState('')
  const [startingStreams, setStartingStreams] = useState('')

  const spotify = useSpotifyTrack(trackUrl)

  // Auto-fill fields when Spotify data arrives
  if (spotify.data && !trackName && spotify.data.title !== 'Unknown') {
    setTrackName(spotify.data.title)
  }
  if (spotify.data?.playCount != null && !startingStreams) {
    setStartingStreams(String(spotify.data.playCount))
  }

  function handleClose(): void {
    onClose()
    setArtistId('')
    setTrackUrl('')
    setTrackName('')
    setStartingStreams('')
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Campaign">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!artistId) return
          const form = new FormData(e.currentTarget)
          const artist = artists?.find((a) => a.id === artistId)
          await createCampaign.mutateAsync({
            artist_id: artistId,
            name: trackName || `${artist?.name ?? 'Unknown'} Campaign`,
            track_name: trackName || undefined,
            track_spotify_url: trackUrl || undefined,
            total_budget: form.get('total_budget') ? Number(form.get('total_budget')) : undefined,
            target_streams: form.get('target_streams')
              ? Number(form.get('target_streams'))
              : undefined,
            starting_streams: startingStreams ? Number(startingStreams) : undefined,
          })
          handleClose()
        }}
        className="space-y-5"
      >
        <div>
          <Label htmlFor="nc-artist">
            Artist <span className="text-red-500 normal-case">*</span>
          </Label>
          <SearchSelect
            fullWidth
            value={artistId}
            onChange={setArtistId}
            options={(artists ?? []).map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Search artists..."
          />
        </div>
        <div>
          <Label htmlFor="nc-url" optional>
            Track Spotify URL
          </Label>
          <Input
            id="nc-url"
            value={trackUrl}
            onChange={(e) => {
              setTrackUrl(e.target.value)
              setTrackName('')
              setStartingStreams('')
            }}
            placeholder="https://open.spotify.com/track/..."
          />
          {spotify.isLoading && (
            <p className="mt-1 text-xs text-teal-600">Fetching track data from Spotify...</p>
          )}
          {spotify.error && <p className="mt-1 text-xs text-red-500">{spotify.error}</p>}
        </div>

        {spotify.data && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            {spotify.data.artUrl ? (
              <img
                src={spotify.data.artUrl}
                alt=""
                className="h-12 w-12 rounded object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200">
                <Music2 className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{spotify.data.title}</p>
              <p className="truncate text-xs text-gray-500">
                {spotify.data.artist} · {spotify.data.album}
              </p>
              {spotify.data.playCount != null && (
                <p className="text-xs text-gray-400">
                  {spotify.data.playCount.toLocaleString()} plays
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="nc-track" optional>
            Track Name
          </Label>
          <Input
            id="nc-track"
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            placeholder={spotify.isLoading ? 'Auto-filling...' : 'e.g. Midnight Drive'}
          />
        </div>
        <div>
          <Label htmlFor="nc-budget" optional>
            Amount Paid
          </Label>
          <Input id="nc-budget" name="total_budget" type="number" step="0.01" placeholder="0.00" />
        </div>
        <div>
          <Label htmlFor="nc-target" optional>
            Target Streams
          </Label>
          <Input id="nc-target" name="target_streams" type="number" placeholder="e.g. 10000" />
        </div>
        <div>
          <Label htmlFor="nc-starting" optional>
            Starting Play Count
          </Label>
          <Input
            id="nc-starting"
            type="number"
            value={startingStreams}
            onChange={(e) => setStartingStreams(e.target.value)}
            placeholder={spotify.isLoading ? 'Auto-filling...' : 'Current stream count'}
          />
        </div>
        <div className="flex gap-3 pt-3">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createCampaign.isPending}
            className="flex-1"
          >
            {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
