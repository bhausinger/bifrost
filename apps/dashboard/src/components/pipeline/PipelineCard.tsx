import { useDraggable } from '@dnd-kit/core'
import { Mail, Users, Music2, Clock } from 'lucide-react'
import { getFollowUpStatus } from '@/hooks/useFollowUpStatus'
import type { PipelineEntry, Artist } from '@/types'

interface PipelineCardProps {
  entry: PipelineEntry & { artist: Artist }
  ownerName?: string
  onClick: () => void
}

const AVATAR_COLORS = [
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500',
]

function getAvatarGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function PipelineCard({ entry, ownerName, onClick }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: entry.id, data: { entry } })

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  const followUp = getFollowUpStatus(entry)
  const hasFollowUp = followUp.urgency !== 'none'
  const gradient = getAvatarGradient(entry.artist.name)

  // Days in current stage
  const daysInStage = Math.floor(
    (Date.now() - new Date(entry.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={onClick}
      className={`group cursor-grab rounded-lg border bg-white border-gray-200 p-3 transition-[box-shadow,border-color,transform,opacity] duration-200 ease-out hover:border-gray-300 active:cursor-grabbing active:scale-[0.98] ${
        isDragging ? 'opacity-30 ring-2 ring-teal-500/30' : ''
      } ${
        hasFollowUp
          ? `${followUp.borderColor} border-l-[3px] ${followUp.bgColor}`
          : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {entry.artist.image_url ? (
            <img
              src={entry.artist.image_url}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-200 shadow-sm"
            />
          ) : (
            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${gradient} shadow-sm ring-2 ring-gray-200`}>
              <span className="text-xs font-bold text-white">
                {entry.artist.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Name + email indicator */}
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-gray-900 leading-tight">
              {entry.artist.name}
            </h3>
            {entry.artist.email && (
              <Mail className="h-3 w-3 flex-shrink-0 text-gray-400" />
            )}
          </div>

          {/* Stats row: followers, tracks, days */}
          <div className="mt-1 flex items-center gap-2.5 text-[11px] text-gray-400">
            {entry.artist.follower_count != null && entry.artist.follower_count > 0 && (
              <span className="flex items-center gap-0.5 font-data">
                <Users className="h-3 w-3" />
                {formatListeners(entry.artist.follower_count)}
              </span>
            )}
            {entry.artist.track_count != null && entry.artist.track_count > 0 && (
              <span className="flex items-center gap-0.5 font-data">
                <Music2 className="h-3 w-3" />
                {entry.artist.track_count}
              </span>
            )}
            {daysInStage > 0 && (
              <span className="flex items-center gap-0.5 font-data">
                <Clock className="h-3 w-3" />
                {daysInStage}d
              </span>
            )}
          </div>

          {/* Follow-up urgency */}
          {hasFollowUp && (
            <div
              className={`mt-1.5 text-[11px] font-semibold ${
                followUp.urgency === 'critical'
                  ? 'text-red-600'
                  : followUp.urgency === 'urgent'
                    ? 'text-orange-600'
                    : followUp.urgency === 'overdue'
                      ? 'text-amber-600'
                      : 'text-blue-600'
              }`}
            >
              {followUp.label}
            </div>
          )}

          {/* Owner name */}
          {ownerName && (
            <div className="mt-1 text-[11px] text-gray-500">
              {ownerName}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
