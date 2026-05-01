"""
Spotify play count scraper — uses anonymous web token + Partner/GraphQL API.

Flow:
1. Get anonymous access token (embed page → fallback to client token endpoint)
2. Get track's album ID from standard API
3. Query Partner API for album tracks (includes play counts)
4. Match the target track and return its play count

No API keys or cookies needed — uses anonymous tokens.
"""
import re
import json
import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

API_URL = "https://api.spotify.com/v1"
PARTNER_URL = "https://api-partner.spotify.com/pathfinder/v1/query"
EMBED_URL = "https://open.spotify.com/embed/track/{track_id}"
CLIENT_TOKEN_URL = "https://clienttoken.spotify.com/v1/clienttoken"

TRACK_ID_PATTERN = re.compile(r"spotify\.com/track/([a-zA-Z0-9]+)")
TOKEN_PATTERN = re.compile(r'"accessToken":"([^"]+)"')

# Partner API hash for album tracks with play counts
ALBUM_TRACKS_HASH = "3ea563e1d68f486d8df30f69de9dcedae74c77e684b889ba7408c589d30f7f2e"

# Spotify's public web player client ID (not a secret — visible in page source)
WEB_CLIENT_ID = "d8a5ed958d274c2e8ee717e6a4b0971d"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

MAX_RETRIES = 3


def extract_track_id(url: str) -> Optional[str]:
    """Extract Spotify track ID from a URL."""
    match = TRACK_ID_PATTERN.search(url)
    return match.group(1) if match else None


class SpotifyClient:
    """Async client for Spotify play count retrieval."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        self._token: Optional[str] = None

    async def __aenter__(self) -> "SpotifyClient":
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            follow_redirects=True,
            headers={
                "User-Agent": USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._client:
            await self._client.aclose()

    async def _get_token_embed(self, track_id: str) -> Optional[str]:
        """Try to get token from embed page."""
        try:
            resp = await self._client.get(
                EMBED_URL.format(track_id=track_id),
                headers={"Accept": "text/html"},
            )
            if resp.status_code != 200:
                logger.warning("Embed page returned %d", resp.status_code)
                return None
            match = TOKEN_PATTERN.search(resp.text)
            if match:
                return match.group(1)
            logger.warning("No token found in embed page HTML")
            return None
        except httpx.HTTPError as e:
            logger.warning("Embed page request failed: %s", e)
            return None

    async def _get_token_client(self) -> Optional[str]:
        """Try to get token from client token endpoint."""
        try:
            resp = await self._client.post(
                CLIENT_TOKEN_URL,
                json={
                    "client_data": {
                        "client_version": "1.2.0",
                        "client_id": WEB_CLIENT_ID,
                        "js_sdk_data": {},
                    }
                },
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code != 200:
                logger.warning("Client token endpoint returned %d", resp.status_code)
                return None
            data = resp.json()
            token = data.get("granted_token", {}).get("token")
            if token:
                return token
            logger.warning("No token in client token response")
            return None
        except (httpx.HTTPError, json.JSONDecodeError) as e:
            logger.warning("Client token request failed: %s", e)
            return None

    async def _get_token(self, track_id: str) -> str:
        """Get access token — tries embed page first, then client token."""
        for attempt in range(MAX_RETRIES):
            # Strategy 1: Embed page token (works best with Partner API)
            token = await self._get_token_embed(track_id)
            if token:
                self._token = token
                logger.info("Got token from embed page")
                return token

            # Strategy 2: Client token endpoint
            token = await self._get_token_client()
            if token:
                self._token = token
                logger.info("Got token from client token endpoint")
                return token

            if attempt < MAX_RETRIES - 1:
                logger.warning("Token fetch failed, retrying (attempt %d)", attempt + 1)
                await asyncio.sleep(2)

        raise RuntimeError("Failed to obtain Spotify access token from all sources")

    async def _api_get(self, path: str) -> dict:
        """Call standard Spotify API with 429 retry."""
        for attempt in range(MAX_RETRIES):
            resp = await self._client.get(
                f"{API_URL}{path}",
                headers={"Authorization": f"Bearer {self._token}"},
            )
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 5))
                if attempt < MAX_RETRIES - 1:
                    logger.warning("Rate limited, waiting %ds", retry_after)
                    await asyncio.sleep(retry_after)
                    continue
                raise RuntimeError("Spotify rate limited — try again later")
            if resp.status_code == 401:
                raise RuntimeError("Token rejected by Spotify API")
            resp.raise_for_status()
            return resp.json()
        raise RuntimeError("Spotify API failed after retries")

    async def _partner_query(self, variables: dict) -> dict:
        """Call Partner/GraphQL API for album tracks with play counts."""
        params = {
            "operationName": "queryAlbumTracks",
            "variables": json.dumps(variables),
            "extensions": json.dumps(
                {"persistedQuery": {"version": 1, "sha256Hash": ALBUM_TRACKS_HASH}}
            ),
        }
        for attempt in range(MAX_RETRIES):
            resp = await self._client.get(
                PARTNER_URL,
                params=params,
                headers={
                    "Authorization": f"Bearer {self._token}",
                    "app-platform": "WebPlayer",
                },
            )
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 5))
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(retry_after)
                    continue
                raise RuntimeError("Partner API rate limited")
            if resp.status_code != 200:
                logger.warning("Partner API %d (attempt %d)", resp.status_code, attempt + 1)
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(1)
                    continue
                raise RuntimeError(f"Partner API returned {resp.status_code}")
            data = resp.json()
            if "errors" in data:
                msg = data["errors"][0].get("message", "unknown")
                if msg == "PersistedQueryNotFound":
                    raise RuntimeError("Partner API hash is stale — needs updating")
                raise RuntimeError(f"Partner API error: {msg}")
            return data
        raise RuntimeError("Partner API failed after retries")

    async def get_playcount(self, spotify_url: str) -> dict:
        """Get play count for a Spotify track URL."""
        track_id = extract_track_id(spotify_url)
        if not track_id:
            raise ValueError(f"Invalid Spotify track URL: {spotify_url}")

        # Step 1: Get token
        await self._get_token(track_id)

        # Step 2: Get track metadata + album ID
        track_info = await self._api_get(f"/tracks/{track_id}")
        album_id = track_info.get("album", {}).get("id")
        track_name = track_info.get("name", "Unknown")
        artist_name = (track_info.get("artists") or [{}])[0].get("name", "Unknown")
        album_name = track_info.get("album", {}).get("name", "Unknown")

        if not album_id:
            raise RuntimeError("Could not determine album for track")

        # Step 3: Query Partner API for album tracks with play counts
        data = await self._partner_query(
            {"uri": f"spotify:album:{album_id}", "offset": 0, "limit": 300}
        )

        # Parse response — Spotify uses different response shapes
        album_data = data.get("data", {})
        tracks_container = (
            album_data.get("albumUnion", {}).get("tracks", {})
            or album_data.get("album", {}).get("tracks", {})
        )
        tracks_items = tracks_container.get("items", [])

        for item in tracks_items:
            track = item.get("track", {})
            if track.get("uri") == f"spotify:track:{track_id}":
                return {
                    "trackId": track_id,
                    "title": track_name,
                    "artist": artist_name,
                    "album": album_name,
                    "playCount": int(track.get("playcount", "0")),
                    "source": "spotify_partner_api",
                }

        return {
            "trackId": track_id,
            "title": track_name,
            "artist": artist_name,
            "album": album_name,
            "playCount": None,
            "source": "spotify_standard_api",
            "note": "Play count not found in album response",
        }
