import { useState } from 'react'
import { Music2, Users, ExternalLink, Mail, Instagram, Pencil } from 'lucide-react'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import { PIPELINE_BOARD_STAGES } from '@/types'
import type { PipelineEntry, Artist, PipelineStage } from '@/types'
import type { Tab } from './pipelineDetailTypes'
import { formatNumber } from './pipelineDetailTypes'

type Activity = {
  id: string
  description: string
  created_at: string
  type: string
}

type PipelineDetailOverviewProps = {
  entry: PipelineEntry & { artist: Artist }
  activities: Activity[] | undefined
  daysInStage: number
  onMoveStage: (entryId: string, newStage: PipelineStage) => void
  onTabChange: (tab: Tab) => void
  onClose: () => void
}

export function PipelineDetailOverview({
  entry,
  activities,
  daysInStage,
  onMoveStage,
  onTabChange,
  onClose,
}: PipelineDetailOverviewProps): JSX.Element {
  const createCampaign = useCreateCampaign()
  const canMoveToCampaign = ['responded', 'follow_up'].includes(entry.stage)

  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [campaignName, setCampaignName] = useState(`${entry.artist.name} - Campaign`)
  const [trackName, setTrackName] = useState('')
  const [trackUrl, setTrackUrl] = useState('')

  async function handleCreateCampaign(): Promise<void> {
    await createCampaign.mutateAsync({
      artist_id: entry.artist_id,
      pipeline_entry_id: entry.id,
      name: campaignName,
      track_name: trackName || undefined,
      track_spotify_url: trackUrl || undefined,
      total_budget: entry.deal_value ?? undefined,
    })
    setShowCreateCampaign(false)
    onClose()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-600 capitalize">
          {entry.stage.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-400">{daysInStage}d in stage</span>
      </div>

      <SoundCloudStats entry={entry} />

      {entry.artist.genres.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Genres</h3>
          <div className="flex flex-wrap gap-1.5">
            {entry.artist.genres.map((g) => (
              <span key={g} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{g}</span>
            ))}
          </div>
        </div>
      )}

      <ContactSection entry={entry} onTabChange={onTabChange} />

      {entry.notes && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Notes</h3>
          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">{entry.notes}</div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Move to stage</h3>
        <div className="flex flex-wrap gap-1">
          {PIPELINE_BOARD_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => onMoveStage(entry.id, stage)}
              disabled={stage === entry.stage}
              className={`rounded px-2.5 py-1 text-xs capitalize ${
                stage === entry.stage
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {stage.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {canMoveToCampaign && !showCreateCampaign && (
        <button
          onClick={() => setShowCreateCampaign(true)}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all"
        >
          Move to Campaign
        </button>
      )}

      {showCreateCampaign && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-50 p-3 space-y-2">
          <h3 className="text-sm font-medium text-emerald-700">New Campaign</h3>
          <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign name" className="input-field w-full text-sm" />
          <input type="text" value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Track name" className="input-field w-full text-sm" />
          <input type="url" value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} placeholder="Spotify track URL" className="input-field w-full text-sm" />
          <div className="flex gap-2">
            <button onClick={handleCreateCampaign} disabled={!campaignName} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              Create
            </button>
            <button onClick={() => setShowCreateCampaign(false)} className="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {activities && activities.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Activity</h3>
          <div className="space-y-2">
            {activities.slice(0, 5).map((a) => (
              <div key={a.id} className="border-l-2 border-gray-200 pl-3">
                <div className="text-sm text-gray-700">{a.description}</div>
                <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SoundCloudStats({ entry }: { entry: PipelineEntry & { artist: Artist } }): JSX.Element {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-600">SoundCloud</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-orange-50 p-4">
          <Users className="mb-1 h-5 w-5 text-orange-600" />
          <div className="font-display text-2xl font-bold text-gray-900">{formatNumber(entry.artist.follower_count)}</div>
          <div className="text-xs text-gray-500">Followers</div>
        </div>
        <div className="rounded-lg bg-orange-50 p-4">
          <Music2 className="mb-1 h-5 w-5 text-orange-600" />
          <div className="font-display text-2xl font-bold text-gray-900">{formatNumber(entry.artist.track_count)}</div>
          <div className="text-xs text-gray-500">Tracks</div>
        </div>
        {entry.artist.soundcloud_url ? (
          <a
            href={entry.artist.soundcloud_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-orange-50 p-4 transition-colors hover:bg-orange-100"
          >
            <ExternalLink className="mb-1 h-5 w-5 text-orange-600" />
            <div className="font-display text-sm font-bold text-orange-700">View Profile</div>
            <div className="text-xs text-gray-500">On SoundCloud</div>
          </a>
        ) : (
          <div className="rounded-lg bg-gray-50 p-4 opacity-50">
            <ExternalLink className="mb-1 h-5 w-5 text-gray-400" />
            <div className="font-display text-sm font-bold text-gray-400">No URL</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ContactSection({
  entry,
  onTabChange,
}: {
  entry: PipelineEntry & { artist: Artist }
  onTabChange: (tab: Tab) => void
}): JSX.Element | null {
  if (!entry.artist.email && !entry.artist.instagram_handle && !entry.artist.spotify_url) return null

  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Contact</h3>
      <div className="space-y-2">
        {entry.artist.email && (
          <div className="group flex items-center gap-2 text-sm text-gray-700">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${entry.artist.email}`} className="hover:text-teal-600">{entry.artist.email}</a>
            <button onClick={() => onTabChange('edit')} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity">
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        {entry.artist.instagram_handle && (
          <div className="group flex items-center gap-2 text-sm text-gray-700">
            <Instagram className="h-4 w-4 text-gray-400" />
            <a
              href={`https://instagram.com/${entry.artist.instagram_handle.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-600"
            >
              {entry.artist.instagram_handle.startsWith('@') ? entry.artist.instagram_handle : `@${entry.artist.instagram_handle}`}
            </a>
            <button onClick={() => onTabChange('edit')} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity">
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        {entry.artist.spotify_url && (
          <div className="group flex items-center gap-2 text-sm text-gray-700">
            <ExternalLink className="h-4 w-4 text-gray-400" />
            <a href={entry.artist.spotify_url} target="_blank" rel="noopener noreferrer" className="text-[#1DB954] hover:underline">
              Spotify
            </a>
            <button onClick={() => onTabChange('edit')} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity">
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
