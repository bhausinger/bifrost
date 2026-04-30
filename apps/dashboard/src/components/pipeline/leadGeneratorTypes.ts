export const IMPORT_STAGE_OPTIONS = [
  { value: 'discovered', label: 'Discovered' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
]

export type Step =
  | 'config'
  | 'discovering'
  | 'results'
  | 'scraping'
  | 'review'
  | 'importing'
  | 'done'

export type DiscoveredLead = {
  name: string
  url: string
  followers: number
  track_count: number
  genre: string
  last_modified: string | null
  avatar_url: string | null
  city: string | null
  country: string | null
  sc_user_id: string | null
  selected: boolean
}

export type FilterStats = {
  total_raw: number
  below_min: number
  above_max: number
  no_tracks: number
  too_old: number
  passed: number
}

export type ScrapedLead = DiscoveredLead & {
  email: string | null
  editedEmail: string
  spotify_url: string | null
  instagram_handle: string | null
  image_url: string | null
  bio: string | null
  social_links: Record<string, string>
  isDuplicate: boolean
  isBlocked: boolean
  duplicateNote: string
}

export type LeadGeneratorModalProps = {
  onClose: () => void
}

export const GENRES = [
  'Electronic', 'Hip-Hop', 'Pop', 'R&B', 'Rock', 'Indie', 'House', 'Techno',
  'Drum & Bass', 'Dubstep', 'Trap', 'Lo-Fi', 'Ambient', 'Soul', 'Funk',
  'Latin', 'UKG', 'Jungle', 'Grime', 'Afrobeats', 'Amapiano', 'Jersey Club',
  'Drill', 'Phonk',
]

export const UPLOAD_RECENCY = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 3 months', value: 90 },
  { label: 'Last 6 months', value: 180 },
  { label: 'Last year', value: 365 },
  { label: 'Any time', value: 0 },
]

export const STEP_META: Record<Step, { label: string; num: number }> = {
  config: { label: 'Configure', num: 1 },
  discovering: { label: 'Discovering', num: 2 },
  results: { label: 'Select Artists', num: 2 },
  scraping: { label: 'Scraping', num: 3 },
  review: { label: 'Review & Import', num: 3 },
  importing: { label: 'Importing', num: 4 },
  done: { label: 'Complete', num: 4 },
}

export const STEP_LABELS = ['Configure', 'Discover', 'Scrape', 'Import']
