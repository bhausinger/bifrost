import type { PipelineStage } from '@/types'

export const IMPORT_STAGE_OPTIONS = [
  { value: 'discovered', label: 'Discovered' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
]

export type Step = 'input' | 'scraping' | 'results' | 'importing' | 'done'

export type ScrapedArtist = {
  name: string
  email: string | null
  spotify_url: string | null
  soundcloud_url: string | null
  instagram_handle: string | null
  genres: string[]
  track_count: number | null
  follower_count: number | null
  image_url: string | null
  source: string
  selected: boolean
  editedEmail: string
  isDuplicate: boolean
  duplicateNote: string
}

export type ScrapeProgress = {
  total: number
  done: number
  successful: number
  emailsFound: number
  failed: number
  eta: string
}

export type ScraperModalProps = {
  onClose: () => void
}

export type ImportProgress = {
  done: number
  total: number
}

export type ImportResults = {
  imported: number
  skipped: number
  failed: number
}

export type { PipelineStage }
