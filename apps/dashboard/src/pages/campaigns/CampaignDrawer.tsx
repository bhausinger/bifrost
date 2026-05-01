import { useState, useRef, useEffect } from 'react'
import { ExternalLink, Music2, RefreshCw } from 'lucide-react'
import { useCampaignPlacements } from '@/hooks/usePlacements'
import { useUpdateCampaign } from '@/hooks/useCampaigns'
import { fetchSpotifyPlaycount } from '@/lib/api/scraper'
import {
  DetailCard,
  DetailCardHeader,
  Textarea,
  Select,
  Input,
  Label,
  Button,
} from '@/components/ui'
import {
  PLACEMENT_STATUS_ICON,
  getAvatarGradient,
  type CampaignWithArtist,
} from './campaignConstants'

function CampaignCardContent({
  selected,
  updateCampaign,
}: {
  selected: CampaignWithArtist
  updateCampaign: ReturnType<typeof useUpdateCampaign>
}): JSX.Element {
  const { data: placements, isLoading: placementsLoading } = useCampaignPlacements(selected.id)
  const [notes, setNotes] = useState(selected.notes ?? '')
  const [notesDirty, setNotesDirty] = useState(false)
  const [isFetchingStreams, setIsFetchingStreams] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNotes(selected.notes ?? '')
    setNotesDirty(false)
  }, [selected.id, selected.notes])

  function handleNotesChange(value: string): void {
    setNotes(value)
    setNotesDirty(true)
    if (notesTimeout.current) clearTimeout(notesTimeout.current)
    notesTimeout.current = setTimeout(() => {
      updateCampaign.mutate({ id: selected.id, notes: value })
      setNotesDirty(false)
    }, 1000)
  }

  function handleNotesBlur(): void {
    if (notesDirty) {
      if (notesTimeout.current) clearTimeout(notesTimeout.current)
      updateCampaign.mutate({ id: selected.id, notes })
      setNotesDirty(false)
    }
  }

  const budget = selected.total_budget ?? 0
  const cost = selected.total_cost ?? 0
  const profit = budget - cost
  const margin = budget > 0 ? Math.round((profit / budget) * 100) : 0

  const streamProgress =
    selected.target_streams && selected.target_streams > 0
      ? Math.min(100, Math.round((selected.actual_streams / selected.target_streams) * 100))
      : null

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Status
        </h3>
        <Select
          value={selected.status}
          onChange={(value) => updateCampaign.mutate({ id: selected.id, status: value })}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'pitching', label: 'Pitching' },
            { value: 'paused', label: 'Paused' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          fullWidth
        />
      </div>

      {selected.track_name && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Track
          </h3>
          <p className="text-sm font-medium text-gray-900">{selected.track_name}</p>
          {selected.track_spotify_url && (
            <a
              href={selected.track_spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-[#1DB954] hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open on Spotify
            </a>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Financials
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-400">Amount Paid</p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-600">
              ${budget.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-400">Spent on Curators</p>
            <p className="mt-1 font-mono text-lg font-bold text-gray-900">
              ${cost.toLocaleString()}
            </p>
          </div>
        </div>
        {budget > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">Profit</span>
              <span
                className={`font-mono text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
              >
                ${profit.toLocaleString()}
              </span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                margin >= 50
                  ? 'bg-emerald-50 text-emerald-600'
                  : margin >= 20
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-red-50 text-red-500'
              }`}
            >
              {margin}% margin
            </span>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Streams
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="starting-streams">Starting</Label>
            <Input
              id="starting-streams"
              type="number"
              value={selected.starting_streams ?? 0}
              onChange={(e) =>
                updateCampaign.mutate({ id: selected.id, starting_streams: Number(e.target.value) })
              }
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor="current-streams">Current</Label>
            <Input
              id="current-streams"
              type="number"
              value={selected.actual_streams}
              onChange={(e) =>
                updateCampaign.mutate({ id: selected.id, actual_streams: Number(e.target.value) })
              }
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor="target-streams">Target</Label>
            <Input
              id="target-streams"
              type="number"
              value={selected.target_streams ?? ''}
              onChange={(e) =>
                updateCampaign.mutate({
                  id: selected.id,
                  target_streams: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="—"
              className="font-mono"
            />
          </div>
        </div>
        {selected.track_spotify_url && (
          <div className="mt-2">
            <Button
              variant="secondary"
              onClick={async () => {
                setIsFetchingStreams(true)
                setFetchError(null)
                try {
                  const result = await fetchSpotifyPlaycount(selected.track_spotify_url!)
                  if (result.playCount !== null && result.playCount !== undefined) {
                    updateCampaign.mutate({ id: selected.id, actual_streams: result.playCount })
                  } else {
                    setFetchError(result.note ?? 'Play count unavailable')
                  }
                } catch (e) {
                  setFetchError(e instanceof Error ? e.message : 'Failed to fetch')
                } finally {
                  setIsFetchingStreams(false)
                }
              }}
              disabled={isFetchingStreams}
              className="flex w-full items-center justify-center gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingStreams ? 'animate-spin' : ''}`} />
              {isFetchingStreams ? 'Fetching from Spotify...' : 'Fetch Current from Spotify'}
            </Button>
            {fetchError && <p className="mt-1 text-xs text-red-500">{fetchError}</p>}
          </div>
        )}
        {(() => {
          const gained = selected.actual_streams - (selected.starting_streams ?? 0)
          return (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Streams gained</span>
                <span
                  className={`font-mono text-sm font-bold ${gained > 0 ? 'text-emerald-600' : 'text-gray-900'}`}
                >
                  {gained.toLocaleString()}
                </span>
              </div>
              {streamProgress !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    streamProgress >= 100
                      ? 'bg-emerald-50 text-emerald-600'
                      : streamProgress >= 50
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {streamProgress}% of target
                </span>
              )}
            </div>
          )
        })()}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Placements
          {placements && placements.length > 0 && (
            <span className="ml-1.5 text-gray-300">({placements.length})</span>
          )}
        </h3>
        {placementsLoading && <p className="text-xs text-gray-400">Loading...</p>}
        {!placementsLoading && (!placements || placements.length === 0) && (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
            <Music2 className="mx-auto h-5 w-5 text-gray-300" />
            <p className="mt-1.5 text-xs text-gray-400">No placements yet</p>
          </div>
        )}
        {!placementsLoading && placements && placements.length > 0 && (
          <div className="space-y-2">
            {placements.map((p) => {
              const statusCfg = PLACEMENT_STATUS_ICON[p.status] ?? PLACEMENT_STATUS_ICON.pending!
              const Icon = statusCfg.icon
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${statusCfg.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.playlist?.name ?? 'Unknown playlist'}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {p.playlist?.curator?.name ?? 'Unknown curator'}
                      {p.cost !== null && ` · $${p.cost.toLocaleString()}`}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-medium capitalize ${statusCfg.color}`}
                  >
                    {p.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Notes
          {notesDirty && <span className="ml-1.5 text-gray-300">saving...</span>}
        </h3>
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes... e.g. 'artist wants update by April 5'"
          rows={3}
          className="resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}

export function CampaignDrawer({
  selected,
  onClose,
  updateCampaign,
}: {
  selected: CampaignWithArtist
  onClose: () => void
  updateCampaign: ReturnType<typeof useUpdateCampaign>
}): JSX.Element {
  return (
    <DetailCard
      open
      onClose={onClose}
      header={
        <DetailCardHeader
          title={selected.name}
          subtitle={selected.artist?.name}
          avatar={selected.artist?.image_url}
          avatarGradient={getAvatarGradient(selected.artist?.name ?? selected.name)}
          onClose={onClose}
        />
      }
    >
      <CampaignCardContent selected={selected} updateCampaign={updateCampaign} />
    </DetailCard>
  )
}
