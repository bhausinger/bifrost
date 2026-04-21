import type { Curator, Playlist } from '@/types'

export type CuratorWithPlaylists = Curator & { playlists: Playlist[] }

export const AVATAR_COLORS = [
  'from-fuchsia-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
]

export function getCuratorGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

export const PROGRESS_STEPS = ['emailed_at', 'followed_up_at', 'replied_at', 'confirmed_at'] as const
export const PROGRESS_LABELS = ['Emailed', 'Followed up', 'Replied', 'Confirmed']

export type ProgressField = typeof PROGRESS_STEPS[number]
