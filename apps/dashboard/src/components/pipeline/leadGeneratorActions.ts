import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { fetchDedupData, checkDuplicate, type DedupData } from '@/lib/dedup'
import type { PipelineStage } from '@/types'
import type { DiscoveredLead, ScrapedLead } from './leadGeneratorTypes'

const SCRAPER_URL = env.VITE_SCRAPER_URL

type DiscoverParams = {
  seedUrl: string
  minFollowers: number
  maxFollowers: number
  selectedGenres: string[]
  uploadRecency: number
  maxResults: number
}

type DiscoverResult = {
  leads: DiscoveredLead[]
  totalFound: number
  excluded: number
  filterStats: { total_raw: number; below_min: number; above_max: number; no_tracks: number; too_old: number; passed: number } | null
  dedup: DedupData
}

export async function discoverArtists(params: DiscoverParams): Promise<DiscoverResult> {
  const res = await fetch(`${SCRAPER_URL}/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seed_url: params.seedUrl,
      min_followers: params.minFollowers,
      max_followers: params.maxFollowers,
      genres: params.selectedGenres.length > 0 ? params.selectedGenres : undefined,
      uploaded_within_days: params.uploadRecency || undefined,
      max_results: params.maxResults,
    }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  const results = data.results || []
  const totalFound = data.total_found ?? results.length
  const filterStats = data.filter_stats ?? null

  const dedup = await fetchDedupData()

  let excluded = 0
  const leads: DiscoveredLead[] = []
  for (const r of results as Array<{
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
  }>) {
    const reason = checkDuplicate(dedup, r.url, null, r.name, null)
    if (reason) {
      excluded++
      continue
    }
    leads.push({
      name: r.name,
      url: r.url,
      followers: r.followers ?? 0,
      track_count: r.track_count ?? 0,
      genre: r.genre ?? '',
      last_modified: r.last_modified ?? null,
      avatar_url: r.avatar_url ?? null,
      city: r.city ?? null,
      country: r.country ?? null,
      sc_user_id: r.sc_user_id ?? null,
      selected: true,
    })
  }

  return { leads, totalFound, excluded, filterStats, dedup }
}

type ScrapeCallbacks = {
  onProgress: (done: number, emailsFound: number, eta: string) => void
  onFeedItem: (name: string, hasEmail: boolean) => void
}

export async function scrapeArtists(
  selected: DiscoveredLead[],
  dedup: DedupData | null,
  callbacks: ScrapeCallbacks,
): Promise<ScrapedLead[]> {
  const scraped: ScrapedLead[] = []
  const startTime = Date.now()
  const dedupData = dedup ?? await fetchDedupData()
  let emailsFound = 0

  for (let i = 0; i < selected.length; i++) {
    const lead = selected[i]!
    const elapsed = Date.now() - startTime
    const perItem = elapsed / (i + 1)
    const remaining = Math.round(
      (perItem * (selected.length - i - 1)) / 1000
    )
    const eta =
      remaining > 60
        ? `~${Math.round(remaining / 60)}m`
        : `~${remaining}s`

    try {
      const response = await fetch(`${SCRAPER_URL}/scrape/soundcloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: lead.url }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      const reason = checkDuplicate(dedupData, lead.url, data.email, data.name ?? lead.name, data.bio)
      const isFlagged = !!reason

      scraped.push({
        ...lead,
        email: data.email ?? null,
        editedEmail: data.email || '',
        spotify_url: data.spotify_url ?? null,
        instagram_handle: data.instagram ?? null,
        image_url: data.image_url || lead.avatar_url,
        bio: data.bio ?? null,
        social_links: data.social_links ?? {},
        isDuplicate: isFlagged,
        isBlocked: false,
        duplicateNote: reason ?? '',
        selected: !isFlagged && !!data.email,
        followers: data.followers ?? lead.followers,
        track_count: data.track_count ?? lead.track_count,
      })

      if (data.email) emailsFound++
      callbacks.onFeedItem(data.name ?? lead.name, !!data.email)
      callbacks.onProgress(i + 1, emailsFound, eta)
    } catch {
      scraped.push({
        ...lead,
        email: null,
        editedEmail: '',
        spotify_url: null,
        instagram_handle: null,
        image_url: lead.avatar_url,
        bio: null,
        social_links: {},
        isDuplicate: false,
        isBlocked: false,
        duplicateNote: '',
        selected: false,
      })

      callbacks.onFeedItem(lead.name, false)
      callbacks.onProgress(i + 1, emailsFound, eta)
    }
  }

  return scraped
}

type ImportCallbacks = {
  onProgress: (done: number, total: number) => void
}

type ImportResult = {
  imported: number
  skipped: number
  failed: number
}

export async function importArtists(
  selected: ScrapedLead[],
  importStage: PipelineStage,
  createEntry: { mutateAsync: (params: { artistId: string; stage: PipelineStage }) => Promise<unknown> },
  callbacks: ImportCallbacks,
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < selected.length; i++) {
    const artist = selected[i]!
    try {
      const { data: newArtist, error: artistError } = await supabase
        .from('artists')
        .insert({
          name: artist.name,
          email: artist.editedEmail || null,
          spotify_url: artist.spotify_url,
          soundcloud_url: artist.url,
          instagram_handle: artist.instagram_handle,
          genres: artist.genre ? [artist.genre] : [],
          track_count: artist.track_count || null,
          follower_count: artist.followers || null,
          image_url: artist.image_url,
          location: [artist.city, artist.country]
            .filter(Boolean)
            .join(', ') || null,
          bio: artist.bio,
          source: 'lead_generator',
          other_socials: artist.social_links || {},
          tags: [],
        })
        .select()
        .single()

      if (artistError) {
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('soundcloud_url', artist.url)
          .single()

        if (existingArtist) {
          skipped++
        } else {
          throw artistError
        }
      } else {
        await createEntry.mutateAsync({
          artistId: newArtist.id,
          stage: importStage,
        })
        imported++
      }
    } catch {
      failed++
    }

    callbacks.onProgress(i + 1, selected.length)
  }

  return { imported, skipped, failed }
}

export function downloadLeadsCsv(scrapedLeads: ScrapedLead[]): void {
  const headers = [
    'Name',
    'Email',
    'SoundCloud URL',
    'Followers',
    'Genre',
    'Location',
    'Instagram',
    'Spotify',
  ]
  const rows = scrapedLeads.map((r) => [
    r.name,
    r.editedEmail,
    r.url || '',
    String(r.followers ?? ''),
    r.genre,
    [r.city, r.country].filter(Boolean).join(', '),
    r.instagram_handle || '',
    r.spotify_url || '',
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${c}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lead-generator-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
