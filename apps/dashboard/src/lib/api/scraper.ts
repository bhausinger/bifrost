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
const ALBUM_TRACKS_HASH = '3ea563e1d68f486d8df30f69de9dcedae74c77e684b889ba7408c589d30f7f2e'

function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

/**
 * Fetch Spotify play count entirely client-side via Vercel proxy rewrites.
 *
 * Spotify blocks cloud IPs (Railway, AWS, etc.) but not Vercel's edge.
 * All three API calls go through Vercel rewrites:
 *   /api/spotify-embed/:id  → open.spotify.com/embed/track/:id  (get token)
 *   /api/spotify-api/:path  → api.spotify.com/:path              (get album ID)
 *   /api/spotify-partner/*  → api-partner.spotify.com/*           (get play count)
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

  // Step 2: Get track metadata + album ID via Vercel proxy
  const trackRes = await fetch(`/api/spotify-api/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!trackRes.ok) throw new Error(`Spotify API failed (${trackRes.status})`)
  const trackInfo = await trackRes.json()
  const albumId = trackInfo.album?.id as string | undefined
  const trackName = (trackInfo.name as string) ?? 'Unknown'
  const artistName = (trackInfo.artists?.[0]?.name as string) ?? 'Unknown'
  const albumName = (trackInfo.album?.name as string) ?? 'Unknown'

  if (!albumId) throw new Error('Could not determine album for track')

  // Step 3: Get play count from Partner API via Vercel proxy
  const variables = JSON.stringify({ uri: `spotify:album:${albumId}`, offset: 0, limit: 300 })
  const extensions = JSON.stringify({
    persistedQuery: { version: 1, sha256Hash: ALBUM_TRACKS_HASH },
  })
  const partnerRes = await fetch(
    `/api/spotify-partner/pathfinder/v1/query?operationName=queryAlbumTracks&variables=${encodeURIComponent(variables)}&extensions=${encodeURIComponent(extensions)}`,
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

  // Parse response — Spotify uses different response shapes
  const albumData = partnerData.data ?? {}
  const tracksContainer = albumData.albumUnion?.tracks ?? albumData.album?.tracks ?? {}
  const items = (tracksContainer.items ?? []) as Array<{
    track: { uri: string; playcount: string; name: string }
  }>

  for (const item of items) {
    if (item.track?.uri === `spotify:track:${trackId}`) {
      return {
        trackId,
        title: trackName,
        artist: artistName,
        album: albumName,
        playCount: parseInt(item.track.playcount ?? '0', 10),
        source: 'spotify_partner_api',
      }
    }
  }

  return {
    trackId,
    title: trackName,
    artist: artistName,
    album: albumName,
    playCount: null,
    source: 'spotify_standard_api',
    note: 'Play count not found in album response',
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
