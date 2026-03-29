import { useState } from 'react'
import { usePipelineActivities } from '@/hooks/usePipeline'
import { useExcludeArtist } from '@/hooks/useExcludeList'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import type { PipelineEntry, Artist, PipelineStage } from '@/types'
import { PIPELINE_BOARD_STAGES } from '@/types'
import { ExcludeModal } from '@/components/exclude/ExcludeModal'
import { getFollowUpStatus } from '@/hooks/useFollowUpStatus'

interface PipelineDetailProps {
  entry: PipelineEntry & { artist: Artist }
  onClose: () => void
  onMoveStage: (entryId: string, newStage: PipelineStage) => void
}

export function PipelineDetail({
  entry,
  onClose,
  onMoveStage,
}: PipelineDetailProps) {
  const { data: activities } = usePipelineActivities(entry.id)
  const excludeArtist = useExcludeArtist()
  const createCampaign = useCreateCampaign()
  const [showExcludeModal, setShowExcludeModal] = useState(false)
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [campaignName, setCampaignName] = useState(
    `${entry.artist.name} - Campaign`
  )
  const [trackName, setTrackName] = useState('')
  const [trackUrl, setTrackUrl] = useState('')

  const followUp = getFollowUpStatus(entry)
  const canMoveToCampaign = ['responded', 'follow_up'].includes(entry.stage)

  async function handleCreateCampaign() {
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
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col border-l border-gray-200 bg-white shadow-modal">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-gray-900">
            {entry.artist.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Follow-up alert */}
          {followUp.urgency !== 'none' && (
            <div
              className={`mb-4 rounded-md p-3 text-sm font-medium ${
                followUp.urgency === 'critical'
                  ? 'bg-red-50 text-red-600'
                  : followUp.urgency === 'urgent'
                    ? 'bg-orange-50 text-orange-600'
                    : followUp.urgency === 'overdue'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
              }`}
            >
              {followUp.label}
            </div>
          )}

          {/* Artist Info */}
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
              Artist Info
            </h3>
            <div className="space-y-1 text-sm">
              {entry.artist.email && (
                <div className="text-gray-700">
                  <span className="text-gray-400">Email: </span>
                  {entry.artist.email}
                </div>
              )}
              {entry.artist.spotify_url && (
                <div>
                  <span className="text-gray-400">Spotify: </span>
                  <a
                    href={entry.artist.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1DB954] hover:underline"
                  >
                    Open
                  </a>
                </div>
              )}
              {entry.artist.soundcloud_url && (
                <div>
                  <span className="text-gray-400">SoundCloud: </span>
                  <a
                    href={entry.artist.soundcloud_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline"
                  >
                    Open
                  </a>
                </div>
              )}
              {entry.artist.monthly_listeners != null && (
                <div className="text-gray-700">
                  <span className="text-gray-400">Monthly listeners: </span>
                  <span className="font-mono">{entry.artist.monthly_listeners.toLocaleString()}</span>
                </div>
              )}
              {entry.artist.genres.length > 0 && (
                <div className="text-gray-700">
                  <span className="text-gray-400">Genres: </span>
                  {entry.artist.genres.join(', ')}
                </div>
              )}
              {entry.artist.instagram_handle && (
                <div className="text-gray-700">
                  <span className="text-gray-400">Instagram: </span>
                  @{entry.artist.instagram_handle}
                </div>
              )}
            </div>
          </div>

          {/* Outreach Timeline */}
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Outreach</h3>
            <div className="space-y-1 text-sm">
              <div className="text-gray-700">
                <span className="text-gray-400">Stage: </span>
                <span className="font-medium capitalize">{entry.stage.replace('_', ' ')}</span>
              </div>
              {entry.contacted_at && (
                <div className="text-gray-700">
                  <span className="text-gray-400">Contacted: </span>
                  {new Date(entry.contacted_at).toLocaleDateString()}
                </div>
              )}
              {entry.responded_at && (
                <div className="text-gray-700">
                  <span className="text-gray-400">Responded: </span>
                  {new Date(entry.responded_at).toLocaleDateString()}
                </div>
              )}
              {entry.notes && (
                <div className="text-gray-700">
                  <span className="text-gray-400">Notes: </span>
                  {entry.notes}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stage Actions */}
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
              Move to Stage
            </h3>
            <div className="flex flex-wrap gap-1">
              {PIPELINE_BOARD_STAGES.map((stage) => (
                <button
                  key={stage}
                  onClick={() => onMoveStage(entry.id, stage)}
                  disabled={stage === entry.stage}
                  className={`rounded px-2.5 py-1 text-xs capitalize ${
                    stage === entry.stage
                      ? 'bg-gray-900 text-gray-900'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {stage.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Move to Campaign */}
          {canMoveToCampaign && !showCreateCampaign && (
            <div className="mb-6">
              <button
                onClick={() => setShowCreateCampaign(true)}
                className="btn-primary w-full rounded-lg px-3 py-2.5 text-sm font-semibold shadow-sm transition-all"
              >
                Move to Campaign
              </button>
              <p className="mt-1.5 text-center text-xs text-gray-400">Ready to discuss pricing? Create a campaign to track the deal.</p>
            </div>
          )}

          {showCreateCampaign && (
            <div className="mb-6 rounded-md border border-emerald-500/20 bg-emerald-50 p-3">
              <h3 className="mb-2 text-sm font-medium text-emerald-600">
                New Campaign
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Campaign name"
                  className="input-field w-full text-sm"
                />
                <input
                  type="text"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="Track name"
                  className="input-field w-full text-sm"
                />
                <input
                  type="url"
                  value={trackUrl}
                  onChange={(e) => setTrackUrl(e.target.value)}
                  placeholder="Spotify track URL"
                  className="input-field w-full text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCampaign}
                    disabled={!campaignName}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:text-gray-400"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateCampaign(false)}
                    className="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
              Activity
            </h3>
            <div className="space-y-3">
              {activities?.map((activity) => (
                <div
                  key={activity.id}
                  className="border-l-2 border-gray-300 pl-3"
                >
                  <div className="text-sm text-gray-700">
                    {activity.description}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <div className="text-sm text-gray-400">No activity yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => setShowExcludeModal(true)}
            className="w-full rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
          >
            Exclude Artist
          </button>
        </div>
      </div>

      {showExcludeModal && (
        <ExcludeModal
          artistName={entry.artist.name}
          onConfirm={async (reason, notes) => {
            if (entry.artist.email) {
              await excludeArtist.mutateAsync({
                artistId: entry.artist_id,
                email: entry.artist.email,
                reason,
                notes,
              })
            }
            setShowExcludeModal(false)
            onClose()
          }}
          onCancel={() => setShowExcludeModal(false)}
        />
      )}
    </>
  )
}
