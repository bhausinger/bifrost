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
const GET_TRACK_HASH = '612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294'

function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

/**
 * Fetch Spotify play count client-side via Vercel proxy rewrites.
 * Two calls only — no Spotify API key needed:
 *   1. /api/spotify-embed/:id → anonymous token from embed page
 *   2. /api/spotify-partner/* → getTrack query returns play count directly
 */
export async function fetchSpotifyPlaycount(url: string): Promise<SpotifyPlaycountResult> {
  const trackId = extractSpotifyTrackId(url)
  if (!trackId) throw new Error('Invalid Spotify track URL')

  // Step 1: Get anonymous token from embed page via Vercel proxy
  const embedRes = await fetch(`/api/spotify-embed/${trackId}`)
  if (!embedRes.ok) throw new Error(`Embed page failed (${embedRes.status})`)
  const embedHtml = await embedRes.text()
  const tokenMatch = embedHtml.match(SPOTIFY_TOKEN_PATTERN)
  if (!tokenMatch) throw new Error('Could not extract Spotify token')
  const token = tokenMatch[1]

  // Step 2: Get play count from Partner API via Vercel proxy
  const variables = JSON.stringify({ uri: `spotify:track:${trackId}` })
  const extensions = JSON.stringify({
    persistedQuery: { version: 1, sha256Hash: GET_TRACK_HASH },
  })
  const partnerRes = await fetch(
    `/api/spotify-partner/pathfinder/v1/query?operationName=getTrack&variables=${encodeURIComponent(variables)}&extensions=${encodeURIComponent(extensions)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'app-platform': 'WebPlayer',
      },
    },
  )
  if (!partnerRes.ok) throw new Error(`Partner API failed (${partnerRes.status})`)
  const partnerData = await partnerRes.json()

  if (partnerData.errors) {
    throw new Error(partnerData.errors[0]?.message ?? 'Partner API error')
  }

  const track = partnerData.data?.trackUnion ?? {}
  const albumInfo = track.albumOfTrack ?? {}

  return {
    trackId,
    title: (track.name as string) ?? 'Unknown',
    artist: albumInfo.artists?.items?.[0]?.profile?.name ?? 'Unknown',
    album: albumInfo.name ?? 'Unknown',
    playCount: track.playcount != null ? parseInt(String(track.playcount), 10) : null,
    source: 'spotify_partner_api',
  }
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
