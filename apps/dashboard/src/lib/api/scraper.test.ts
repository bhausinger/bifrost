import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: { VITE_SCRAPER_URL: 'http://test-scraper' },
}))

import { discoverArtists, scrapeArtist, scraperHealthCheck } from '@/lib/api/scraper'
import type { DiscoverParams } from '@/lib/api/scraper'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const DISCOVER_PARAMS: DiscoverParams = {
  seed_url: 'https://soundcloud.com/seed',
  min_followers: 100,
  max_followers: 10000,
  max_results: 50,
}

describe('discoverArtists', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends correct POST body and returns typed response', async () => {
    const responseBody = {
      results: [
        {
          name: 'Test Artist',
          url: 'https://soundcloud.com/test',
          followers: 500,
          track_count: 10,
          genre: 'Electronic',
          last_modified: '2026-01-01',
          avatar_url: null,
          city: null,
          country: null,
          sc_user_id: '123',
        },
      ],
      total_found: 1,
      filter_stats: { total_raw: 10, below_min: 3, above_max: 2, no_tracks: 1, too_old: 3, passed: 1 },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(responseBody),
    })

    const result = await discoverArtists(DISCOVER_PARAMS)

    expect(mockFetch).toHaveBeenCalledWith('http://test-scraper/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DISCOVER_PARAMS),
    })
    expect(result.results).toHaveLength(1)
    expect(result.results[0]!.name).toBe('Test Artist')
    expect(result.total_found).toBe(1)
    expect(result.filter_stats).toEqual(responseBody.filter_stats)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(discoverArtists(DISCOVER_PARAMS)).rejects.toThrow('HTTP 500')
  })

  it('defaults results to [] and filter_stats to null when missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const result = await discoverArtists(DISCOVER_PARAMS)

    expect(result.results).toEqual([])
    expect(result.filter_stats).toBeNull()
    expect(result.total_found).toBe(0)
  })
})

describe('scraperHealthCheck', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns { ok: true, latencyMs } on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await scraperHealthCheck()

    expect(mockFetch).toHaveBeenCalledWith('http://test-scraper', expect.objectContaining({
      signal: expect.any(AbortSignal),
    }))
    expect(result.ok).toBe(true)
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('returns { ok: false, latencyMs: 0 } on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'))

    const result = await scraperHealthCheck()

    expect(result.ok).toBe(false)
    expect(result.latencyMs).toBe(0)
  })

  it('returns { ok: false, latencyMs: 0 } on abort/timeout', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'))

    const result = await scraperHealthCheck()

    expect(result.ok).toBe(false)
    expect(result.latencyMs).toBe(0)
  })
})

describe('scrapeArtist', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends correct POST body and returns typed response', async () => {
    const scrapedData = {
      name: 'Scraped Artist',
      email: 'artist@example.com',
      spotify_url: 'https://spotify.com/artist',
      instagram: '@artist',
      image_url: 'https://img.com/a.jpg',
      bio: 'Great producer',
      social_links: { twitter: 'https://twitter.com/artist' },
      followers: 1500,
      track_count: 25,
      genres: ['House', 'Techno'],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(scrapedData),
    })

    const url = 'https://soundcloud.com/test-artist'
    const result = await scrapeArtist(url)

    expect(mockFetch).toHaveBeenCalledWith('http://test-scraper/scrape/soundcloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    expect(result.name).toBe('Scraped Artist')
    expect(result.email).toBe('artist@example.com')
    expect(result.genres).toEqual(['House', 'Techno'])
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(scrapeArtist('https://soundcloud.com/missing')).rejects.toThrow('HTTP 404')
  })
})
