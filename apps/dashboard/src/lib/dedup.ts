import { supabase } from '@/lib/supabase'

/** Cached dedup data — fetched once, reused across discovery + scrape steps */
export interface DedupData {
  urls: Set<string>
  emails: Set<string>
  pipelineUrls: Set<string>
  campaignUrls: Set<string>
  excludedEmails: Set<string>
  blockedTerms: Array<{ term: string; type: string }>
}

/** Fetch all dedup data in parallel (artists, pipeline, campaigns, excluded, blocked terms). */
export async function fetchDedupData(): Promise<DedupData> {
  const [artistsRes, pipelineRes, campaignsRes, excludedRes, blockedRes] =
    await Promise.all([
      supabase.from('artists').select('soundcloud_url, spotify_url, email'),
      supabase
        .from('pipeline_entries')
        .select('artist:artists(soundcloud_url, email)')
        .not('stage', 'in', '("completed","lost")'),
      supabase
        .from('campaigns')
        .select('artist:artists(soundcloud_url, email)')
        .not('status', 'in', '("cancelled")'),
      supabase.from('excluded_artists').select('email'),
      supabase.from('blocked_terms').select('term, type').catch(() => ({ data: [], error: null })),
    ])

  const artists = artistsRes.data ?? []
  const urls = new Set<string>()
  const emails = new Set<string>()
  for (const a of artists) {
    if (a.soundcloud_url) urls.add(a.soundcloud_url.toLowerCase())
    if (a.spotify_url) urls.add(a.spotify_url.toLowerCase())
    if (a.email) emails.add(a.email.toLowerCase())
  }

  const pipelineUrls = new Set<string>()
  for (const pe of (pipelineRes.data ?? []) as any[]) {
    if (pe.artist?.soundcloud_url) pipelineUrls.add(pe.artist.soundcloud_url.toLowerCase())
    if (pe.artist?.email) emails.add(pe.artist.email.toLowerCase())
  }

  const campaignUrls = new Set<string>()
  for (const c of (campaignsRes.data ?? []) as any[]) {
    if (c.artist?.soundcloud_url) campaignUrls.add(c.artist.soundcloud_url.toLowerCase())
    if (c.artist?.email) emails.add(c.artist.email.toLowerCase())
  }

  const excludedEmails = new Set<string>(
    (excludedRes.data ?? []).map((e) => e.email?.toLowerCase()).filter(Boolean) as string[]
  )

  return {
    urls,
    emails,
    pipelineUrls,
    campaignUrls,
    excludedEmails,
    blockedTerms: blockedRes.data ?? [],
  }
}

/** Check why an artist is flagged. Returns null if clean, or a reason string. */
export function checkDuplicate(
  dedup: DedupData,
  scUrl: string | null,
  email: string | null,
  name: string | null,
  bio: string | null,
): string | null {
  const urlLC = scUrl?.toLowerCase() ?? ''
  const emailLC = email?.toLowerCase() ?? ''

  if (urlLC && dedup.campaignUrls.has(urlLC)) return 'Active campaign'
  if (urlLC && dedup.pipelineUrls.has(urlLC)) return 'In pipeline'
  if (urlLC && dedup.urls.has(urlLC)) return 'Already in database'
  if (emailLC && dedup.emails.has(emailLC)) return 'Email already known'
  if (emailLC && dedup.excludedEmails.has(emailLC)) return 'Excluded'

  // Blocked terms
  const nameLC = (name ?? '').toLowerCase()
  const bioLC = (bio ?? '').toLowerCase()
  for (const bt of dedup.blockedTerms) {
    const term = bt.term.toLowerCase()
    if (nameLC.includes(term) || emailLC.includes(term) || bioLC.includes(term)) {
      return `Blocked: ${bt.term}`
    }
  }

  return null
}
