import type { CuratorOutreach } from '@/types'
import { PROGRESS_STEPS, PROGRESS_LABELS, type ProgressField } from './curatorUtils'

export function ProgressDots({
  entry,
  onToggle,
}: {
  entry: CuratorOutreach
  onToggle: (field: ProgressField) => void
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {PROGRESS_STEPS.map((field, i) => (
        <span key={field} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300 select-none">›</span>}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(field)
            }}
            title={`${PROGRESS_LABELS[i]}: ${entry[field] ? new Date(entry[field]!).toLocaleDateString() : 'Click to mark'}`}
            className={`cursor-pointer transition-colors hover:underline ${
              entry[field] ? 'text-emerald-600 font-medium' : 'text-gray-300'
            }`}
          >
            {PROGRESS_LABELS[i]}
          </button>
        </span>
      ))}
    </div>
  )
}
