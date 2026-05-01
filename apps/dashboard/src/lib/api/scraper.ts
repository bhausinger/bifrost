import { env } from '@/lib/env'

const SCRAPER_URL = env.VITE_SCRAPER_URL

type DiscoverParams = {
  seed_url: string
  min_followers: number
  max_followers: number
  genres?: string[]
  uploaded_within_days?: number
  max_results: number
}

type DiscoverResultItem = {
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
}

type FilterStats = {
  total_raw: number
  below_min: number
  above_max: number
  no_tracks: number
  too_old: number
  passed: number
}

type DiscoverResponse = {
  results: DiscoverResultItem[]
  total_found: number
  filter_stats: FilterStats | null
}

type ScrapedData = {
  name: string
  email: string | null
  spotify_url: string | null
  instagram: string | null
  image_url: string | null
  bio: string | null
  social_links: Record<string, string>
  followers: number | null
  track_count: number | null
  genres: string[]
}

type HealthCheckResult = {
  ok: boolean
  latencyMs: number
}

export type {
  DiscoverParams,
  DiscoverResultItem,
  FilterStats,
  DiscoverResponse,
  ScrapedData,
  HealthCheckResult,
}

const HEALTH_CHECK_TIMEOUT_MS = 5000

export async function scraperHealthCheck(): Promise<HealthCheckResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)
  const start = performance.now()
  try {
    const res = await fetch(SCRAPER_URL, { signal: controller.signal })
    const latencyMs = Math.round(performance.now() - start)
    return { ok: res.ok, latencyMs }
  } catch {
    return { ok: false, latencyMs: 0 }
  } finally {
    clearTimeout(timeout)
  }
}

export async function discoverArtists(params: DiscoverParams): Promise<DiscoverResponse> {
  const res = await fetch(`${SCRAPER_URL}/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return {
    results: data.results || [],
    total_found: data.total_found ?? (data.results || []).length,
    filter_stats: data.filter_stats ?? null,
  }
}

type SpotifyPlaycountResult = {
  trackId: string
  title: string
  artist: string
  album: string
  playCount: number | null
  popularity?: number
  source: string
  note?: string
}

export type { SpotifyPlaycountResult }

const SPOTIFY_TOKEN_PATTERN = /"accessToken":"([^"]+)"/

/** Extract track ID from a Spotify URL. */
function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

/**
 * Fetch Spotify play count for a track URL.
 *
 * Flow: browser fetches embed page via Vercel proxy (not blocked by Spotify)
 * → extracts anonymous token → sends token to scraper → scraper calls
 * Partner API (API endpoints don't block cloud IPs, only web pages do).
 */
export async function fetchSpotifyPlaycount(url: string): Promise<SpotifyPlaycountResult> {
  const trackId = extractSpotifyTrackId(url)
  if (!trackId) throw new Error('Invalid Spotify track URL')

  // Step 1: Fetch embed page via Vercel proxy to get anonymous token
  const embedRes = await fetch(`/api/spotify-embed/${trackId}`)
  if (!embedRes.ok) throw new Error(`Failed to load Spotify embed page (${embedRes.status})`)
  const embedHtml = await embedRes.text()
  const tokenMatch = embedHtml.match(SPOTIFY_TOKEN_PATTERN)
  if (!tokenMatch) throw new Error('Could not extract Spotify token from embed page')
  const token = tokenMatch[1]

  // Step 2: Send token + URL to scraper — it does the Partner API call
  const res = await fetch(`${SCRAPER_URL}/spotify/playcount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, token }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function scrapeArtist(url: string): Promise<ScrapedData> {
  const res = await fetch(`${SCRAPER_URL}/scrape/soundcloud`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
