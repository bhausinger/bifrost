import { useDroppable } from '@dnd-kit/core'
import { PipelineCard } from './PipelineCard'
import type { PipelineEntry, Artist, PipelineStage } from '@/types'

interface PipelineColumnProps {
  stage: PipelineStage
  entries: (PipelineEntry & { artist: Artist })[]
  onCardClick: (entry: PipelineEntry & { artist: Artist }) => void
  getOwnerName?: (userId: string | null) => string
}

const STAGE_CONFIG: Record<string, { label: string; accent: string; dot: string; countBg: string; countText: string }> = {
  discovered: {
    label: 'Discovered',
    accent: 'text-gray-700',
    dot: 'bg-gray-400',
    countBg: 'bg-gray-100',
    countText: 'text-gray-500',
  },
  contacted: {
    label: 'Contacted',
    accent: 'text-blue-600',
    dot: 'bg-blue-500',
    countBg: 'bg-gray-100',
    countText: 'text-gray-500',
  },
  responded: {
    label: 'Responded',
    accent: 'text-emerald-600',
    dot: 'bg-emerald-500',
    countBg: 'bg-gray-100',
    countText: 'text-gray-500',
  },
  follow_up: {
    label: 'Follow Up',
    accent: 'text-amber-600',
    dot: 'bg-amber-500',
    countBg: 'bg-gray-100',
    countText: 'text-gray-500',
  },
}

const DEFAULT_CONFIG = { label: 'Unknown', accent: 'text-gray-700', dot: 'bg-gray-400', countBg: 'bg-gray-100', countText: 'text-gray-500' }

export function PipelineColumn({
  stage,
  entries,
  onCardClick,
  getOwnerName,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const config = STAGE_CONFIG[stage] ?? DEFAULT_CONFIG

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[260px] flex-1 flex-col rounded-xl border transition-all duration-200 ${
        isOver
          ? 'border-teal-500/50 bg-teal-600/5 shadow-lg scale-[1.01]'
          : 'border-gray-100 bg-white/50'
      }`}
    >
      {/* Column Header */}
      <div className="border-b border-gray-100 rounded-t-xl px-4 py-3.5">
        <div className="flex items-center justify-between">
          <h3 className={`text-[15px] font-bold ${config.accent}`}>
            {config.label}
          </h3>
          <span className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold ${config.countBg} ${config.countText}`}>
            {entries.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
            <div className="text-3xl mb-2 opacity-30">
              {stage === 'follow_up' ? '🔔' : '📭'}
            </div>
            <p className="text-xs font-medium text-gray-300">
              {isOver ? 'Drop here' : 'No artists yet'}
            </p>
          </div>
        )}
        {entries.map((entry) => (
          <PipelineCard
            key={entry.id}
            entry={entry}
            ownerName={getOwnerName?.(entry.assigned_to ?? entry.created_by)}
            onClick={() => onCardClick(entry)}
          />
        ))}
      </div>
    </div>
  )
}
