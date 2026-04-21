import type { CuratorOutreach } from '@/types'
import { PROGRESS_STEPS, PROGRESS_LABELS, type ProgressField } from './curatorUtils'

export function ProgressDots({ entry, onToggle }: { entry: CuratorOutreach; onToggle: (field: ProgressField) => void }) {
  const furthestLabel = (() => {
    for (let i = PROGRESS_STEPS.length - 1; i >= 0; i--) {
      if (entry[PROGRESS_STEPS[i]!]) return PROGRESS_LABELS[i]
    }
    return 'Not started'
  })()

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {PROGRESS_STEPS.map((field, i) => (
          <button
            key={field}
            onClick={(e) => { e.stopPropagation(); onToggle(field) }}
            title={`${PROGRESS_LABELS[i]}: ${entry[field] ? new Date(entry[field]!).toLocaleDateString() : 'Click to mark'}`}
            className={`h-3 w-3 rounded-full transition-all duration-200 ${
              entry[field]
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30 hover:bg-emerald-400'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">{furthestLabel}</span>
    </div>
  )
}
