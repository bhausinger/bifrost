import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkDuplicate, fetchDedupData } from '@/lib/dedup'
import type { DedupData } from '@/lib/dedup'

// Mock supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock env to prevent import.meta.env validation
vi.mock('@/lib/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://test-supabase',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_SCRAPER_URL: 'http://test-scraper',
  },
}))

function makeDedup(overrides: Partial<DedupData> = {}): DedupData {
  return {
    urls: new Set<string>(),
    emails: new Set<string>(),
    pipelineUrls: new Set<string>(),
    campaignUrls: new Set<string>(),
    excludedEmails: new Set<string>(),
    blockedTerms: [],
    ...overrides,
  }
}

describe('checkDuplicate', () => {
  it('returns "Active campaign" when URL is in campaignUrls', () => {
    const dedup = makeDedup({
      campaignUrls: new Set(['https://soundcloud.com/artist-a']),
    })
    const result = checkDuplicate(dedup, 'https://soundcloud.com/artist-a', null, null, null)
    expect(result).toBe('Active campaign')
  })

  it('returns "In pipeline" when URL is in pipelineUrls', () => {
    const dedup = makeDedup({
      pipelineUrls: new Set(['https://soundcloud.com/artist-b']),
    })
    const result = checkDuplicate(dedup, 'https://soundcloud.com/artist-b', null, null, null)
    expect(result).toBe('In pipeline')
  })

  it('returns "Already in database" when URL is in urls', () => {
    const dedup = makeDedup({
      urls: new Set(['https://soundcloud.com/artist-c']),
    })
    const result = checkDuplicate(dedup, 'https://soundcloud.com/artist-c', null, null, null)
    expect(result).toBe('Already in database')
  })

  it('returns "Email already known" when email is in emails', () => {
    const dedup = makeDedup({
      emails: new Set(['test@example.com']),
    })
    const result = checkDuplicate(dedup, null, 'test@example.com', null, null)
    expect(result).toBe('Email already known')
  })

  it('returns "Excluded" when email is in excludedEmails', () => {
    const dedup = makeDedup({
      excludedEmails: new Set(['blocked@example.com']),
    })
    const result = checkDuplicate(dedup, null, 'blocked@example.com', null, null)
    expect(result).toBe('Excluded')
  })

  it('returns "Blocked: <term>" when name contains a blocked term', () => {
    const dedup = makeDedup({
      blockedTerms: [{ term: 'spam', type: 'name' }],
    })
    const result = checkDuplicate(dedup, null, null, 'spammy artist', null)
    expect(result).toBe('Blocked: spam')
  })

  it('returns "Blocked: <term>" when bio contains a blocked term', () => {
    const dedup = makeDedup({
      blockedTerms: [{ term: 'repost', type: 'bio' }],
    })
    const result = checkDuplicate(dedup, null, null, 'Clean Name', 'We do repost networks')
    expect(result).toBe('Blocked: repost')
  })

  it('returns null when artist is clean', () => {
    const dedup = makeDedup({
      urls: new Set(['https://soundcloud.com/other']),
      emails: new Set(['other@example.com']),
      blockedTerms: [{ term: 'spam', type: 'name' }],
    })
    const result = checkDuplicate(
      dedup,
      'https://soundcloud.com/new-artist',
      'new@example.com',
      'Good Artist',
      'Makes great music',
    )
    expect(result).toBeNull()
  })

  it('handles case-insensitive URL matching', () => {
    const dedup = makeDedup({
      urls: new Set(['https://soundcloud.com/artist-lower']),
    })
    const result = checkDuplicate(
      dedup,
      'https://SoundCloud.com/ARTIST-LOWER',
      null,
      null,
      null,
    )
    expect(result).toBe('Already in database')
  })

  it('handles case-insensitive email matching', () => {
    const dedup = makeDedup({
      emails: new Set(['test@example.com']),
    })
    const result = checkDuplicate(dedup, null, 'TEST@EXAMPLE.COM', null, null)
    expect(result).toBe('Email already known')
  })

  it('does not crash on null/empty inputs', () => {
    const dedup = makeDedup()
    expect(checkDuplicate(dedup, null, null, null, null)).toBeNull()
    expect(checkDuplicate(dedup, '', '', '', '')).toBeNull()
  })

  it('prioritizes campaign URL over pipeline URL', () => {
    const url = 'https://soundcloud.com/both'
    const dedup = makeDedup({
      campaignUrls: new Set([url]),
      pipelineUrls: new Set([url]),
    })
    const result = checkDuplicate(dedup, url, null, null, null)
    expect(result).toBe('Active campaign')
  })

  it('checks blocked terms against email too', () => {
    const dedup = makeDedup({
      blockedTerms: [{ term: 'noreply', type: 'email' }],
    })
    const result = checkDuplicate(dedup, null, 'noreply@domain.com', null, null)
    expect(result).toBe('Blocked: noreply')
  })
})

describe('fetchDedupData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('builds Sets correctly from Supabase responses', async () => {
    const { supabase } = await import('@/lib/supabase')
    const mockFrom = supabase.from as ReturnType<typeof vi.fn>

    // Artists response (no .not() chaining)
    const artistsSelect = vi.fn().mockResolvedValue({
      data: [
        { soundcloud_url: 'https://sc.com/a', spotify_url: 'https://spotify.com/a', email: 'a@test.com' },
        { soundcloud_url: null, spotify_url: null, email: 'b@test.com' },
      ],
      error: null,
    })

    // Pipeline response (has .not() chaining)
    const pipelineNot = vi.fn().mockResolvedValue({
      data: [{ artist: { soundcloud_url: 'https://sc.com/pipeline', email: 'pipe@test.com' } }],
      error: null,
    })
    const pipelineSelect = vi.fn().mockReturnValue({ not: pipelineNot })

    // Campaigns response (has .not() chaining)
    const campaignsNot = vi.fn().mockResolvedValue({
      data: [{ artist: { soundcloud_url: 'https://sc.com/campaign', email: 'camp@test.com' } }],
      error: null,
    })
    const campaignsSelect = vi.fn().mockReturnValue({ not: campaignsNot })

    // Excluded response
    const excludedSelect = vi.fn().mockResolvedValue({
      data: [{ email: 'excluded@test.com' }],
      error: null,
    })

    // Blocked terms response
    const blockedSelect = vi.fn().mockResolvedValue({
      data: [{ term: 'spam', type: 'name' }],
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'artists':
          return { select: artistsSelect }
        case 'pipeline_entries':
          return { select: pipelineSelect }
        case 'campaigns':
          return { select: campaignsSelect }
        case 'excluded_artists':
          return { select: excludedSelect }
        case 'blocked_terms':
          return { select: blockedSelect }
        default:
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      }
    })

    const result = await fetchDedupData()

    expect(result.urls.has('https://sc.com/a')).toBe(true)
    expect(result.urls.has('https://spotify.com/a')).toBe(true)
    expect(result.emails.has('a@test.com')).toBe(true)
    expect(result.emails.has('b@test.com')).toBe(true)
    expect(result.pipelineUrls.has('https://sc.com/pipeline')).toBe(true)
    expect(result.campaignUrls.has('https://sc.com/campaign')).toBe(true)
    expect(result.excludedEmails.has('excluded@test.com')).toBe(true)
    expect(result.blockedTerms).toEqual([{ term: 'spam', type: 'name' }])
  })
})
