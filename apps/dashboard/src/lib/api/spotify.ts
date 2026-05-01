const OEMBED_URL = 'https://open.spotify.com/oembed'

type SpotifyOEmbedResponse = {
  title: string
  thumbnail_url: string | null
}

/**
 * Extracts the Spotify playlist ID from a URL.
 * Handles: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
 */
export function extractSpotifyPlaylistId(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

/**
 * Fetches playlist metadata from Spotify's free oEmbed endpoint (no auth needed).
 * Returns the playlist title, or null if the request fails.
 */
export async function fetchPlaylistMeta(
  spotifyUrl: string,
): Promise<{ title: string; thumbnailUrl: string | null } | null> {
  try {
    const res = await fetch(`${OEMBED_URL}?url=${encodeURIComponent(spotifyUrl)}`)
    if (!res.ok) return null
    const data: SpotifyOEmbedResponse = await res.json()
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url ?? null,
    }
  } catch {
    return null
  }
}
