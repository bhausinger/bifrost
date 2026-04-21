export const PIPELINE_STAGES = [
  'discovered',
  'contacted',
  'responded',
  'follow_up',
  'negotiating',
  'paid',
  'placing',
  'active',
  'completed',
  'lost',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

/** Stages shown on the pipeline kanban board (outreach funnel only).
 *  Once they start talking money, move to Campaigns. */
export const PIPELINE_BOARD_STAGES: PipelineStage[] = [
  'discovered',
  'contacted',
  'responded',
  'follow_up',
]

/** Legacy: all non-terminal stages */
export const ACTIVE_STAGES = PIPELINE_STAGES.filter(
  (s) => s !== 'completed' && s !== 'lost'
)

export interface Artist {
  id: string
  name: string
  email: string | null
  spotify_url: string | null
  spotify_artist_id: string | null
  soundcloud_url: string | null
  instagram_handle: string | null
  other_socials: Record<string, string>
  genres: string[]
  track_count: number | null
  follower_count: number | null
  location: string | null
  bio: string | null
  image_url: string | null
  source: string
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface PipelineEntry {
  id: string
  artist_id: string
  stage: PipelineStage
  deal_value: number | null
  package_type: string | null
  notes: string | null
  assigned_to: string | null
  stage_entered_at: string
  contacted_at: string | null
  responded_at: string | null
  paid_at: string | null
  completed_at: string | null
  lost_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  artist?: Artist
}

export interface PipelineActivity {
  id: string
  pipeline_entry_id: string
  type: string
  description: string
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface ExcludedArtist {
  id: string
  email: string | null
  artist_name: string | null
  artist_id: string | null
  reason: string
  notes: string | null
  excluded_by: string | null
  created_at: string
}

export interface Curator {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  genres: string[]
  price_per_10k: number | null
  payment_method: string | null
  payment_handle: string | null
  payment_code: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Playlist {
  id: string
  curator_id: string
  name: string
  spotify_url: string | null
  spotify_playlist_id: string | null
  genre: string | null
  country: string | null
  follower_count: number
  price_per_placement: number | null
  avg_streams_per_placement: number | null
  is_active: boolean
  last_verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  pipeline_entry_id: string | null
  artist_id: string
  name: string
  track_name: string | null
  track_spotify_url: string | null
  track_spotify_id: string | null
  status: string
  total_budget: number | null
  total_cost: number | null
  target_streams: number | null
  actual_streams: number
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Placement {
  id: string
  campaign_id: string
  playlist_id: string
  status: string
  cost: number | null
  placed_at: string | null
  removed_at: string | null
  streams_attributed: number
  notes: string | null
  created_at: string
  updated_at: string
  playlist?: Playlist & { curator?: Curator }
}

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string | null
  category: string | null
  campaign_id: string | null
  artist_id: string | null
  curator_id: string | null
  payment_method: string | null
  reference_id: string | null
  transaction_date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface CuratorOutreach {
  id: string
  playlist_name: string
  playlist_url: string | null
  email: string | null
  genre: string | null
  is_organic: boolean | null
  emailed_at: string | null
  followed_up_at: string | null
  replied_at: string | null
  confirmed_at: string | null
  price_per_10k: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  pipeline: Record<string, number>
  active_campaigns: number
  total_revenue: number
  total_expenses: number
  total_artists: number
  excluded_count: number
  avg_deal_value: number
}
