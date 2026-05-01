"""
Spotify play count scraper — uses Spotify's internal Partner/GraphQL API.

Flow:
1. Extract track ID from Spotify URL
2. Get anonymous access token from embed page
3. Get track's album ID from standard API
4. Query Partner API for album tracks (includes play counts)
5. Match the target track and return its play count

No API keys needed — uses anonymous tokens from Spotify's embed pages.
"""
import re
import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

EMBED_URL = "https://open.spotify.com/embed/track/{track_id}"
API_URL = "https://api.spotify.com/v1"
PARTNER_URL = "https://api-partner.spotify.com/pathfinder/v1/query"

TOKEN_PATTERN = re.compile(r'"accessToken":"([^"]+)"')
TRACK_ID_PATTERN = re.compile(r"spotify\.com/track/([a-zA-Z0-9]+)")
NEXT_DATA_PATTERN = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>')

# Spotify Partner API persisted query hashes — these may need updating
# if Spotify deploys a new web client version.
ALBUM_TRACKS_HASH = "3ea563e1d68f486d8df30f69de9dcedae74c77e684b889ba7408c589c8c6571e"
TRACK_QUERY_HASH = "ae85b52abb74d20a4c331d4143d4772c95f34757bfa8c625c7ee52cba89cd2a5"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

MAX_TOKEN_RETRIES = 3
MAX_QUERY_RETRIES = 2


def extract_track_id(url: str) -> Optional[str]:
    """Extract Spotify track ID from a URL."""
    match = TRACK_ID_PATTERN.search(url)
    return match.group(1) if match else None


class SpotifyClient:
    """Lightweight async client for Spotify's Partner/GraphQL API."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        self._token: Optional[str] = None

    async def __aenter__(self) -> "SpotifyClient":
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(20.0, connect=10.0),
            follow_redirects=True,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            },
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._client:
            await self._client.aclose()

    async def _get_token_and_metadata(self, track_id: str) -> dict:
        """Fetch anonymous token + track metadata from Spotify's embed page.

        Returns dict with 'token' and optionally 'entity' (track metadata from __NEXT_DATA__).
        """
        import json as _json

        for attempt in range(MAX_TOKEN_RETRIES):
            try:
                resp = await self._client.get(
                    EMBED_URL.format(track_id=track_id),
                    headers={"User-Agent": USER_AGENT},
                )
                if resp.status_code != 200:
                    logger.warning(
                        "Embed page returned %d (attempt %d)", resp.status_code, attempt + 1
                    )
                    continue
                token_match = TOKEN_PATTERN.search(resp.text)
                if not token_match:
                    logger.warning("No token in embed page (attempt %d)", attempt + 1)
                    continue
                self._token = token_match.group(1)
                result: dict = {"token": self._token}
                # Try to extract entity metadata from __NEXT_DATA__
                data_match = NEXT_DATA_PATTERN.search(resp.text)
                if data_match:
                    try:
                        next_data = _json.loads(data_match.group(1))
                        entity = (
                            next_data.get("props", {})
                            .get("pageProps", {})
                            .get("state", {})
                            .get("data", {})
                            .get("entity", {})
                        )
                        if entity:
                            result["entity"] = entity
                    except _json.JSONDecodeError:
                        pass
                return result
            except httpx.HTTPError as e:
                logger.warning("Embed page error: %s (attempt %d)", e, attempt + 1)
        raise RuntimeError("Failed to obtain Spotify access token")

    async def _api_get(self, path: str) -> dict:
        """Call standard Spotify API with 429 retry."""
        for attempt in range(3):
            resp = await self._client.get(
                f"{API_URL}{path}",
                headers={"Authorization": f"Bearer {self._token}"},
            )
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 5))
                if attempt < 2:
                    logger.warning("Rate limited, waiting %ds", retry_after)
                    await asyncio.sleep(retry_after)
                    continue
                raise RuntimeError("Spotify rate limited — try again later")
            resp.raise_for_status()
            return resp.json()
        raise RuntimeError("Spotify API failed after retries")

    async def _partner_query(
        self, operation: str, variables: dict, sha256_hash: str
    ) -> dict:
        """Call Spotify's Partner/GraphQL API."""
        import json

        params = {
            "operationName": operation,
            "variables": json.dumps(variables),
            "extensions": json.dumps(
                {"persistedQuery": {"version": 1, "sha256Hash": sha256_hash}}
            ),
        }
        for attempt in range(MAX_QUERY_RETRIES):
            resp = await self._client.get(
                PARTNER_URL,
                params=params,
                headers={
                    "Authorization": f"Bearer {self._token}",
                    "app-platform": "WebPlayer",
                    "spotify-app-version": "1.2.0",
                },
            )
            if resp.status_code == 429:
                raise RuntimeError("Spotify rate limited — try again later")
            if resp.status_code != 200:
                logger.warning(
                    "Partner API returned %d (attempt %d)", resp.status_code, attempt + 1
                )
                continue
            data = resp.json()
            if "errors" in data:
                error_msg = data["errors"][0].get("message", "unknown")
                if error_msg == "PersistedQueryNotFound":
                    raise RuntimeError(
                        "Spotify Partner API query hash is stale — needs updating"
                    )
                logger.warning("Partner API error: %s", error_msg)
                continue
            return data
        raise RuntimeError("Partner API query failed after retries")

    async def get_playcount(self, spotify_url: str) -> dict:
        """
        Get play count for a Spotify track URL.

        Returns dict with trackId, title, artist, album, playCount.
        """
        track_id = extract_track_id(spotify_url)
        if not track_id:
            raise ValueError(f"Invalid Spotify track URL: {spotify_url}")

        # Step 1: Get anonymous token + metadata from embed page
        embed_data = await self._get_token_and_metadata(track_id)
        entity = embed_data.get("entity", {})

        # Extract basic info from embed page (avoids standard API call)
        track_name = entity.get("name", "Unknown")
        artists = entity.get("artists", [])
        artist_name = artists[0].get("name", "Unknown") if artists else "Unknown"

        # Step 2: Get album ID — try standard API first
        album_id = None
        album_name = "Unknown"
        try:
            track_info = await self._api_get(f"/tracks/{track_id}")
            album_id = track_info.get("album", {}).get("id")
            album_name = track_info.get("album", {}).get("name", "Unknown")
            # Use more complete metadata from API if available
            track_name = track_info.get("name", track_name)
            artist_name = (track_info.get("artists") or [{}])[0].get("name", artist_name)
        except RuntimeError as e:
            logger.warning("Standard API failed: %s — skipping album lookup", e)

        # Step 3: Query Partner API for album tracks (includes play counts)
        if album_id:
            try:
                data = await self._partner_query(
                    operation="queryAlbumTracks",
                    variables={
                        "uri": f"spotify:album:{album_id}",
                        "offset": 0,
                        "limit": 300,
                    },
                    sha256_hash=ALBUM_TRACKS_HASH,
                )
                album_data = data.get("data", {}).get("albumUnion", {})
                tracks_data = album_data.get("tracks", {}).get("items", [])
                for item in tracks_data:
                    track = item.get("track", {})
                    uri = track.get("uri", "")
                    if uri == f"spotify:track:{track_id}":
                        playcount_str = track.get("playcount", "0")
                        return {
                            "trackId": track_id,
                            "title": track_name,
                            "artist": artist_name,
                            "album": album_name,
                            "playCount": int(playcount_str),
                            "source": "spotify_partner_album",
                        }
            except RuntimeError as e:
                logger.warning("Album tracks query failed: %s — trying track query", e)

        # Step 4: Fallback — try direct track query
        try:
            data = await self._partner_query(
                operation="getTrack",
                variables={"uri": f"spotify:track:{track_id}"},
                sha256_hash=TRACK_QUERY_HASH,
            )
            track_data = data.get("data", {}).get("trackUnion", {})
            playcount_str = track_data.get("playcount", "0")
            return {
                "trackId": track_id,
                "title": track_name,
                "artist": artist_name,
                "album": album_name,
                "playCount": int(playcount_str),
                "source": "spotify_partner_track",
            }
        except RuntimeError:
            pass

        # Step 5: Last resort — return popularity score (0-100) as fallback
        popularity = track_info.get("popularity", 0)
        return {
            "trackId": track_id,
            "title": track_name,
            "artist": artist_name,
            "album": album_name,
            "playCount": None,
            "popularity": popularity,
            "source": "spotify_standard_api",
            "note": "Exact play count unavailable — Partner API hashes may need updating",
        }
