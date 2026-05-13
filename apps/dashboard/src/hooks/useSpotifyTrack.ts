import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSpotifyTrackData } from '@/lib/api/scraper'
import type { SpotifyTrackData } from '@/lib/api/scraper'

const SPOTIFY_TRACK_PATTERN = /open\.spotify\.com\/track\//
const DEBOUNCE_MS = 800

type UseSpotifyTrackResult = {
  data: SpotifyTrackData | null
  isLoading: boolean
  error: string | null
  fetchTrack: (url: string, force?: boolean) => Promise<SpotifyTrackData | null>
}

/**
 * Auto-fetches Spotify track data when a valid track URL is provided.
 * Debounces to avoid hitting the API on every keystroke.
 * Returns track name, artist, album, play count, and album art.
 */
export function useSpotifyTrack(url: string): UseSpotifyTrackResult {
  const [data, setData] = useState<SpotifyTrackData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchedUrl = useRef<string>('')

  const fetchTrack = useCallback(
    async (trackUrl: string, force = false): Promise<SpotifyTrackData | null> => {
      if (!trackUrl || !SPOTIFY_TRACK_PATTERN.test(trackUrl)) return null
      if (!force && trackUrl === lastFetchedUrl.current) return data

      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchSpotifyTrackData(trackUrl)
        lastFetchedUrl.current = trackUrl
        setData(result)
        return result
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch track data'
        setError(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [data],
  )

  useEffect(() => {
    if (!url || !SPOTIFY_TRACK_PATTERN.test(url)) return
    if (url === lastFetchedUrl.current) return

    const timer = setTimeout(() => {
      fetchTrack(url)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [url, fetchTrack])

  return { data, isLoading, error, fetchTrack }
}
