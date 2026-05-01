import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractSpotifyPlaylistId, fetchPlaylistMeta } from './spotify'

describe('extractSpotifyPlaylistId', () => {
  it('extracts ID from standard URL', () => {
    const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
    expect(extractSpotifyPlaylistId(url)).toBe('37i9dQZF1DXcBWIGoYBM5M')
  })

  it('extracts ID from URL with query params', () => {
    const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123'
    expect(extractSpotifyPlaylistId(url)).toBe('37i9dQZF1DXcBWIGoYBM5M')
  })

  it('returns null for non-playlist URL', () => {
    const url = 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
    expect(extractSpotifyPlaylistId(url)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractSpotifyPlaylistId('')).toBeNull()
  })
})

describe('fetchPlaylistMeta', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  it('returns title and thumbnail on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Today's Top Hits",
          thumbnail_url: 'https://i.scdn.co/image/abc123',
        }),
    })

    const result = await fetchPlaylistMeta(
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    )

    expect(result).toEqual({
      title: "Today's Top Hits",
      thumbnailUrl: 'https://i.scdn.co/image/abc123',
    })
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('open.spotify.com/oembed'))
  })

  it('returns null on HTTP error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 })

    const result = await fetchPlaylistMeta('https://open.spotify.com/playlist/invalid')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await fetchPlaylistMeta(
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    )
    expect(result).toBeNull()
  })
})
