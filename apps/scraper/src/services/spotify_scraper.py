"""
Spotify play count scraper — uses anonymous web token + Partner/GraphQL API.

Flow:
1. Get server time from open.spotify.com/server-time
2. Generate TOTP using Spotify's cipher
3. Get anonymous access token from open.spotify.com/get_access_token
4. Get track's album ID from standard API
5. Query Partner API for album tracks (includes play counts)
6. Match the target track and return its play count

No API keys or cookies needed — uses anonymous tokens with TOTP auth.
"""
import re
import time
import asyncio
import base64
import hashlib
import string
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

API_URL = "https://api.spotify.com/v1"
PARTNER_URL = "https://api-partner.spotify.com/pathfinder/v1/query"
TOKEN_URL = "https://open.spotify.com/get_access_token"
SERVER_TIME_URL = "https://open.spotify.com/server-time"

TRACK_ID_PATTERN = re.compile(r"spotify\.com/track/([a-zA-Z0-9]+)")

# Partner API persisted query hash for album tracks with play counts
ALBUM_TRACKS_HASH = "3ea563e1d68f486d8df30f69de9dcedae74c77e684b889ba7408c589d30f7f2e"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

# TOTP cipher from librespot — XOR'd with position-based offset
SECRET_CIPHER = [12, 56, 76, 33, 88, 44, 88, 33, 78, 78, 11, 66, 22, 22, 55, 69, 54]

MAX_RETRIES = 3


def _generate_totp(server_time_seconds: int) -> str:
    """Generate TOTP token for Spotify's get_access_token endpoint."""
    try:
        import pyotp
    except ImportError:
        raise RuntimeError("pyotp is required — run: pip install pyotp")

    processed = [byte ^ (i % 33 + 9) for i, byte in enumerate(SECRET_CIPHER)]
    processed_str = "".join(map(str, processed))
    utf8_bytes = processed_str.encode()
    hex_str = utf8_bytes.hex()
    # Clean hex string — keep only valid hex chars, ensure even length
    valid_chars = set(string.hexdigits)
    cleaned = "".join(c for c in hex_str if c.lower() in valid_chars)
    if len(cleaned) % 2 != 0:
        cleaned = cleaned[:-1]
    secret_bytes = bytes.fromhex(cleaned)
    secret_b32 = base64.b32encode(secret_bytes).decode().strip("=")

    totp = pyotp.TOTP(secret_b32, interval=30, digits=6, digest=hashlib.sha1)
    return totp.at(int(server_time_seconds))


def extract_track_id(url: str) -> Optional[str]:
    """Extract Spotify track ID from a URL."""
    match = TRACK_ID_PATTERN.search(url)
    return match.group(1) if match else None


class SpotifyClient:
    """Async client for Spotify's Partner/GraphQL API using anonymous TOTP auth."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        self._token: Optional[str] = None

    async def __aenter__(self) -> "SpotifyClient":
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._client:
            await self._client.aclose()

    async def _get_token(self) -> str:
        """Get anonymous access token using TOTP authentication."""
        for attempt in range(MAX_RETRIES):
            try:
                # Step 1: Get server time
                resp = await self._client.get(SERVER_TIME_URL)
                resp.raise_for_status()
                server_time = resp.json().get("serverTime", int(time.time()))

                # Step 2: Generate TOTP
                totp = _generate_totp(server_time)

                # Step 3: Request access token
                resp = await self._client.get(
                    TOKEN_URL,
                    params={
                        "reason": "transport",
                        "productType": "web_player",
                        "totp": totp,
                        "totpVer": "5",
                        "ts": str(int(time.time())),
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                self._token = data.get("accessToken")
                if self._token:
                    return self._token
                logger.warning("No token in response (attempt %d)", attempt + 1)
            except httpx.HTTPError as e:
                logger.warning("Token fetch error: %s (attempt %d)", e, attempt + 1)
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2)
        raise RuntimeError("Failed to obtain Spotify access token")

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
            resp.raise_for_status()
            return resp.json()
        raise RuntimeError("Spotify API failed after retries")

    async def _partner_query(self, variables: dict) -> dict:
        """Call Spotify's Partner/GraphQL API for album tracks."""
        import json

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
                    raise RuntimeError(
                        "Partner API query hash is stale — needs updating"
                    )
                raise RuntimeError(f"Partner API error: {msg}")
            return data
        raise RuntimeError("Partner API failed after retries")

    async def get_playcount(self, spotify_url: str) -> dict:
        """Get play count for a Spotify track URL."""
        track_id = extract_track_id(spotify_url)
        if not track_id:
            raise ValueError(f"Invalid Spotify track URL: {spotify_url}")

        # Step 1: Get anonymous token via TOTP
        await self._get_token()

        # Step 2: Get track info from standard API (need album ID)
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

        # Navigate response — try both known response shapes
        album_data = data.get("data", {})
        tracks_container = (
            album_data.get("albumUnion", {}).get("tracks", {})
            or album_data.get("album", {}).get("tracks", {})
        )
        tracks_items = tracks_container.get("items", [])

        for item in tracks_items:
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
                    "source": "spotify_partner_api",
                }

        # Track not found in album response — return what we have
        return {
            "trackId": track_id,
            "title": track_name,
            "artist": artist_name,
            "album": album_name,
            "playCount": None,
            "source": "spotify_standard_api",
            "note": "Track not found in album response — play count unavailable",
        }
