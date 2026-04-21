import type { PipelineEntry, Artist, PipelineStage } from '@/types'

export type BulkEmailModalProps = {
  entries: (PipelineEntry & { artist: Artist })[]
  onClose: () => void
}

export type SendStatus = 'idle' | 'sending' | 'done'

export type SendProgress = {
  total: number
  sent: number
  failed: number
  skipped: number
  current: string
  errors: { artist: string; error: string }[]
  skippedList: { artist: string; reason: string }[]
}

export type StageFilter = 'all' | PipelineStage

export const INITIAL_PROGRESS: SendProgress = {
  total: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  current: '',
  errors: [],
  skippedList: [],
}

export const DEFAULT_SUBJECT = 'Spotify Playlist Placement Opportunity'

export const DEFAULT_BODY = `Hi {{artistName}},

I came across your music and think it would be a great fit for some of our curated Spotify playlists.

We work with playlist curators across multiple genres to get artists real, organic streams. Our placements typically see {{deckLink}} within the first month.

Would you be interested in learning more about our placement packages?

Best,
{{senderName}}`

export const FILTERABLE_STAGES = [
  'all',
  'discovered',
  'contacted',
  'responded',
  'follow_up',
] as const
