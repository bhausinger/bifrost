import type { PipelineStage } from '@/types'

export type ScSearchStep =
  | 'input'
  | 'searching'
  | 'results'
  | 'scraping'
  | 'review'
  | 'importing'
  | 'done'

export type SearchMatch = {
  query: string
  match: MatchedArtist | null
  confidence: number
  alternatives: (MatchedArtist & { confidence: number })[]
  selected: boolean
}

export type MatchedArtist = {
  name: string
  url: string
  followers: number
  track_count: number
  genre: string
  avatar_url: string | null
  city: string | null
  country: string | null
  sc_user_id: string | null
  last_modified: string | null
}

export type ScrapedResult = SearchMatch & {
  email: string | null
  editedEmail: string
  spotify_url: string | null
  instagram_handle: string | null
  image_url: string | null
  bio: string | null
  social_links: Record<string, string>
  isDuplicate: boolean
  duplicateNote: string
}

export type ScSearchModalProps = {
  onClose: () => void
}

export const IMPORT_STAGE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: 'discovered', label: 'Discovered' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
]

export const STEP_META: Record<ScSearchStep, { label: string; num: number }> = {
  input: { label: 'Paste Artist Names', num: 1 },
  searching: { label: 'Searching SoundCloud', num: 2 },
  results: { label: 'Review Matches', num: 2 },
  scraping: { label: 'Scraping Profiles', num: 3 },
  review: { label: 'Review & Import', num: 3 },
  importing: { label: 'Importing', num: 4 },
  done: { label: 'Complete', num: 4 },
}

export const STEP_LABELS = ['Paste Names', 'Search', 'Scrape', 'Import']

export const MIN_CONFIDENCE_DISPLAY = 0.4
