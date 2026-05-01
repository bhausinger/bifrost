import { RefreshCw } from 'lucide-react'
import { useUpdatePlacement } from '@/hooks/usePlacements'
import { useSpotifyTrack } from '@/hooks/useSpotifyTrack'
import { Button } from '@/components/ui'
import { PLACEMENT_STATUS_ICON } from './campaignConstants'
import type { Placement } from '@/types'

type PlacementCardProps = {
  placement: Placement
  trackSpotifyUrl?: string | null
}

export function PlacementCard({ placement, trackSpotifyUrl }: PlacementCardProps): JSX.Element {
  const updatePlacement = useUpdatePlacement()
  const spotify = useSpotifyTrack('')

  const statusCfg = PLACEMENT_STATUS_ICON[placement.status] ?? PLACEMENT_STATUS_ICON.pending!
  const Icon = statusCfg.icon

  const hasSnapshot = placement.streams_at_placement != null
  const isRemoved = placement.status === 'removed'
  const streamsGained =
    placement.streams_at_placement != null && placement.streams_at_removal != null
      ? placement.streams_at_removal - placement.streams_at_placement
      : null

  async function handleRefreshStreams(): Promise<void> {
    if (!trackSpotifyUrl) return
    const result = await spotify.fetchTrack(trackSpotifyUrl)
    if (result?.playCount != null) {
      updatePlacement.mutate({
        id: placement.id,
        streams_attributed: result.playCount - (placement.streams_at_placement ?? 0),
      })
    }
  }

  async function handleMarkRemoved(): Promise<void> {
    let streamsAtRemoval: number | undefined
    if (trackSpotifyUrl) {
      try {
        const result = await spotify.fetchTrack(trackSpotifyUrl)
        streamsAtRemoval = result?.playCount ?? undefined
      } catch {
        // Continue without snapshot
      }
    }
    updatePlacement.mutate({
      id: placement.id,
      status: 'removed',
      removed_at: new Date().toISOString(),
      streams_at_removal: streamsAtRemoval,
      streams_attributed:
        streamsAtRemoval && placement.streams_at_placement
          ? streamsAtRemoval - placement.streams_at_placement
          : undefined,
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 flex-shrink-0 ${statusCfg.color}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {placement.playlist?.name ?? 'Unknown playlist'}
          </p>
          <p className="truncate text-xs text-gray-400">
            {placement.playlist?.curator?.name ?? 'Unknown curator'}
            {placement.cost != null && ` · $${placement.cost.toLocaleString()}`}
          </p>
        </div>
        <span className={`flex-shrink-0 text-xs font-medium capitalize ${statusCfg.color}`}>
          {placement.status}
        </span>
      </div>

      {hasSnapshot && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="text-gray-400">
            Start: {placement.streams_at_placement?.toLocaleString()}
          </span>
          {streamsGained != null ? (
            <span className="font-semibold text-emerald-600">
              +{streamsGained.toLocaleString()} streams
            </span>
          ) : placement.streams_attributed > 0 ? (
            <span className="font-semibold text-emerald-600">
              +{placement.streams_attributed.toLocaleString()} streams (est.)
            </span>
          ) : null}
        </div>
      )}

      {!isRemoved && trackSpotifyUrl && (
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            onClick={handleRefreshStreams}
            disabled={spotify.isLoading}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px]"
          >
            <RefreshCw className={`h-3 w-3 ${spotify.isLoading ? 'animate-spin' : ''}`} />
            {spotify.isLoading ? 'Fetching...' : 'Refresh'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleMarkRemoved}
            disabled={spotify.isLoading}
            className="px-2 py-1 text-[11px] text-red-500 hover:text-red-700"
          >
            Mark Removed
          </Button>
        </div>
      )}

      {spotify.error && <p className="mt-1 text-xs text-red-500">{spotify.error}</p>}
    </div>
  )
}
