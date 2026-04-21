import type { PipelineEntry, Artist, PipelineStage } from '@/types'

export type Tab = 'overview' | 'emails' | 'edit'

export type PipelineDetailProps = {
  entry: PipelineEntry & { artist: Artist }
  onClose: () => void
  onMoveStage: (entryId: string, newStage: PipelineStage) => void
}

export const HEADER_GRADIENT = 'from-teal-500 via-cyan-500 to-teal-600'

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
