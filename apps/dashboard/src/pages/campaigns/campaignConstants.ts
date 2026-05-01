import { CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import type { Campaign, Artist } from '@/types'

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pitching', label: 'Pitching' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export type CampaignWithArtist = Campaign & { artist: Artist }

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

export function getAvatarGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string; ring: string }
> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-600/20',
  },
  pitching: {
    label: 'Pitching',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    dot: 'bg-blue-500',
    ring: 'ring-blue-600/20',
  },
  paused: {
    label: 'Paused',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    ring: 'ring-amber-600/20',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
    ring: 'ring-gray-500/10',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-400',
    ring: 'ring-red-600/20',
  },
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export const PLACEMENT_STATUS_ICON: Record<string, { icon: typeof CheckCircle; color: string }> = {
  placed: { icon: CheckCircle, color: 'text-emerald-500' },
  pending: { icon: Clock, color: 'text-amber-500' },
  removed: { icon: AlertTriangle, color: 'text-red-400' },
}

export function getPacingLabel(
  selected: CampaignWithArtist,
): { label: string; color: string } | null {
  if (!selected.start_date || !selected.target_streams || selected.target_streams === 0) return null
  const start = new Date(selected.start_date).getTime()
  const now = Date.now()
  const end = selected.end_date ? new Date(selected.end_date).getTime() : start + 90 * 86_400_000
  const elapsed = Math.max(0, now - start)
  const total = Math.max(1, end - start)
  const expectedProgress = Math.min(1, elapsed / total)
  const actualProgress = selected.actual_streams / selected.target_streams
  const ratio = actualProgress / Math.max(0.01, expectedProgress)

  if (ratio >= 1.1) return { label: 'Ahead of pace', color: 'text-emerald-600' }
  if (ratio >= 0.85) return { label: 'On pace', color: 'text-gray-500' }
  return { label: 'Behind pace', color: 'text-amber-600' }
}
