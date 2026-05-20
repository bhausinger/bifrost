import { supabase } from '@/lib/supabase'
import { batchSearchSoundCloud, scrapeArtist } from '@/lib/api/scraper'
import { fetchDedupData, checkDuplicate, type DedupData } from '@/lib/dedup'
import type { PipelineStage } from '@/types'
import type { SearchMatch, ScrapedResult } from './scSearchTypes'

export async function batchSearch(names: string[]): Promise<{
  results: SearchMatch[]
  dedup: DedupData
}> {
  const response = await batchSearchSoundCloud(names)
  const dedup = await fetchDedupData()

  const results: SearchMatch[] = response.results.map((r) => {
    const isKnown = r.match ? !!checkDuplicate(dedup, r.match.url, null, r.match.name, null) : false
    return {
      query: r.query,
      match: r.match
        ? {
            name: r.match.name,
            url: r.match.url,
            followers: r.match.followers ?? 0,
            track_count: r.match.track_count ?? 0,
            genre: r.match.genre ?? '',
            avatar_url: r.match.avatar_url ?? null,
            city: r.match.city ?? null,
            country: r.match.country ?? null,
            sc_user_id: r.match.sc_user_id ?? null,
            last_modified: r.match.last_modified ?? null,
          }
        : null,
      confidence: r.confidence,
      alternatives: (r.alternatives ?? []).map((a) => ({
        name: a.name,
        url: a.url,
        followers: a.followers ?? 0,
        track_count: a.track_count ?? 0,
        genre: a.genre ?? '',
        avatar_url: a.avatar_url ?? null,
        city: a.city ?? null,
        country: a.country ?? null,
        sc_user_id: a.sc_user_id ?? null,
        last_modified: a.last_modified ?? null,
        confidence: a.confidence ?? 0,
      })),
      selected: !!r.match && r.confidence >= 0.5 && !isKnown,
    }
  })

  return { results, dedup }
}

type ScrapeCallbacks = {
  onProgress: (done: number, emailsFound: number, eta: string) => void
  onFeedItem: (name: string, hasEmail: boolean) => void
}

export async function scrapeMatches(
  selected: SearchMatch[],
  dedup: DedupData | null,
  callbacks: ScrapeCallbacks,
): Promise<ScrapedResult[]> {
  const scraped: ScrapedResult[] = []
  const dedupData = dedup ?? (await fetchDedupData())
  const startTime = Date.now()
  let emailsFound = 0

  for (let i = 0; i < selected.length; i++) {
    const match = selected[i]!
    const url = match.match?.url
    if (!url) continue

    const elapsed = Date.now() - startTime
    const perItem = elapsed / (i + 1)
    const remaining = Math.round((perItem * (selected.length - i - 1)) / 1000)
    const eta = remaining > 60 ? `~${Math.round(remaining / 60)}m` : `~${remaining}s`

    try {
      const data = await scrapeArtist(url)
      const reason = checkDuplicate(dedupData, url, data.email, data.name ?? match.query, data.bio)

      scraped.push({
        ...match,
        email: data.email ?? null,
        editedEmail: data.email || '',
        spotify_url: data.spotify_url ?? null,
        instagram_handle: data.instagram ?? null,
        image_url: data.image_url || match.match?.avatar_url || null,
        bio: data.bio ?? null,
        social_links: data.social_links ?? {},
        isDuplicate: !!reason,
        duplicateNote: reason ?? '',
        selected: !reason && !!data.email,
      })

      if (data.email) emailsFound++
      callbacks.onFeedItem(data.name ?? match.query, !!data.email)
    } catch {
      scraped.push({
        ...match,
        email: null,
        editedEmail: '',
        spotify_url: null,
        instagram_handle: null,
        image_url: match.match?.avatar_url || null,
        bio: null,
        social_links: {},
        isDuplicate: false,
        duplicateNote: '',
        selected: false,
      })
      callbacks.onFeedItem(match.query, false)
    }

    callbacks.onProgress(i + 1, emailsFound, eta)
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

export async function importMatches(
  selected: ScrapedResult[],
  importStage: PipelineStage,
  createEntry: {
    mutateAsync: (params: { artistId: string; stage: PipelineStage }) => Promise<unknown>
  },
  callbacks: ImportCallbacks,
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < selected.length; i++) {
    const artist = selected[i]!
    const matchData = artist.match
    if (!matchData) {
      skipped++
      callbacks.onProgress(i + 1, selected.length)
      continue
    }

    try {
      const { data: newArtist, error: artistError } = await supabase
        .from('artists')
        .insert({
          name: matchData.name,
          email: artist.editedEmail || null,
          spotify_url: artist.spotify_url,
          soundcloud_url: matchData.url,
          instagram_handle: artist.instagram_handle,
          genres: matchData.genre ? [matchData.genre] : [],
          track_count: matchData.track_count || null,
          follower_count: matchData.followers || null,
          image_url: artist.image_url,
          location: [matchData.city, matchData.country].filter(Boolean).join(', ') || null,
          bio: artist.bio,
          source: 'sc_search',
          other_socials: artist.social_links || {},
          tags: [],
        })
        .select()
        .single()

      if (artistError) {
        const { data: existing } = await supabase
          .from('artists')
          .select('id')
          .eq('soundcloud_url', matchData.url)
          .single()

        if (existing) {
          skipped++
        } else {
          throw artistError
        }
      } else {
        await createEntry.mutateAsync({ artistId: newArtist.id, stage: importStage })
        imported++
      }
    } catch {
      failed++
    }

    callbacks.onProgress(i + 1, selected.length)
  }

  return { imported, skipped, failed }
}

export function downloadSearchCsv(results: ScrapedResult[]): void {
  const headers = [
    'Search Query',
    'Matched Name',
    'SoundCloud URL',
    'Confidence',
    'Email',
    'Followers',
    'Genre',
    'Location',
    'Instagram',
    'Spotify',
  ]
  const rows = results.map((r) => [
    r.query,
    r.match?.name ?? '',
    r.match?.url ?? '',
    String(r.confidence),
    r.editedEmail || '',
    String(r.match?.followers ?? ''),
    r.match?.genre ?? '',
    [r.match?.city, r.match?.country].filter(Boolean).join(', '),
    r.instagram_handle || '',
    r.spotify_url || '',
  ])
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sc-search-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
