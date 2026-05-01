import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCreatePlacement, useCreatePlaylist } from '@/hooks/usePlacements'
import { useUpdateCampaign } from '@/hooks/useCampaigns'
import { fetchPlaylistMeta, extractSpotifyPlaylistId } from '@/lib/api/spotify'
import { Modal, Input, Label, Button, SearchSelect } from '@/components/ui'
import type { Curator } from '@/types'

const SPOTIFY_URL_PATTERN = 'open.spotify.com/playlist'
const DEBOUNCE_MS = 600

type AddPlacementModalProps = {
  open: boolean
  onClose: () => void
  campaignId: string
}

export function AddPlacementModal({
  open,
  onClose,
  campaignId,
}: AddPlacementModalProps): JSX.Element {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [curatorId, setCuratorId] = useState('')
  const [cost, setCost] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createPlaylist = useCreatePlaylist()
  const createPlacement = useCreatePlacement()
  const updateCampaign = useUpdateCampaign()

  const isSpotifyUrl = playlistUrl.includes(SPOTIFY_URL_PATTERN)

  const { data: curators } = useQuery({
    queryKey: ['curators-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curators')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Pick<Curator, 'id' | 'name'>[]
    },
    enabled: open,
  })

  const resolvePlaylist = useCallback(async (url: string) => {
    setIsResolving(true)
    const meta = await fetchPlaylistMeta(url)
    if (meta) {
      setPlaylistName(meta.title)
    }
    setIsResolving(false)
  }, [])

  useEffect(() => {
    if (!isSpotifyUrl || !playlistUrl) return
    const timer = setTimeout(() => {
      resolvePlaylist(playlistUrl)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [playlistUrl, isSpotifyUrl, resolvePlaylist])

  function handleClose(): void {
    setPlaylistUrl('')
    setPlaylistName('')
    setCuratorId('')
    setCost('')
    setSubmitError(null)
    setIsResolving(false)
    onClose()
  }

  async function recalculateTotalCost(): Promise<void> {
    const { data } = await supabase.from('placements').select('cost').eq('campaign_id', campaignId)
    if (!data) return
    const totalCost = data.reduce((sum, p) => sum + (p.cost ?? 0), 0)
    updateCampaign.mutate({ id: campaignId, total_cost: totalCost })
  }

  const isSubmitting = createPlaylist.isPending || createPlacement.isPending
  const canSubmit = playlistName.trim() && curatorId && !isSubmitting

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitError(null)

    try {
      const spotifyId = isSpotifyUrl ? extractSpotifyPlaylistId(playlistUrl) : null

      const playlist = await createPlaylist.mutateAsync({
        name: playlistName.trim(),
        spotify_url: isSpotifyUrl ? playlistUrl.trim() : undefined,
        spotify_playlist_id: spotifyId ?? undefined,
        curator_id: curatorId,
      })

      await createPlacement.mutateAsync({
        campaign_id: campaignId,
        playlist_id: playlist.id,
        cost: cost ? Number(cost) : undefined,
      })

      await recalculateTotalCost()
      handleClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create placement')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Placement">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="ap-url">Spotify Playlist URL</Label>
          <Input
            id="ap-url"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://open.spotify.com/playlist/..."
          />
          {isResolving && <p className="mt-1 text-xs text-gray-400">Fetching playlist info...</p>}
        </div>

        <div>
          <Label htmlFor="ap-name">
            Playlist Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ap-name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder={isSpotifyUrl ? 'Auto-filled from Spotify' : 'Enter playlist name'}
          />
        </div>

        <div>
          <Label htmlFor="ap-curator">
            Curator <span className="text-red-500">*</span>
          </Label>
          <SearchSelect
            fullWidth
            value={curatorId}
            onChange={setCuratorId}
            options={(curators ?? []).map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Search curators..."
          />
        </div>

        <div>
          <Label htmlFor="ap-cost" optional>
            Cost
          </Label>
          <Input
            id="ap-cost"
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
        )}

        <div className="flex gap-3 pt-3">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit} className="flex-1">
            {isSubmitting ? 'Adding...' : 'Add Placement'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
