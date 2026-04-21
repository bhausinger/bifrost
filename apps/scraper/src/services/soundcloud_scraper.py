"""
SoundCloud scraper — core API client and discovery.
Hits SoundCloud's public API directly. No browser, no Playwright.
"""
import re
import asyncio
import datetime
import random
import logging
from typing import Optional
from urllib.parse import urlparse, parse_qs

import httpx

from .models import (
    SC_API, DEFAULT_CLIENT_ID, GENRE_VARIANTS,
    ScrapedArtist, normalize_url, name_from_url, build_artist, user_summary,
)
from .email_utils import extract_email, validate_email, is_junk_email
from .email_scraper import find_email_from_links

logger = logging.getLogger(__name__)


class SoundCloudScraper:
    def __init__(self) -> None:
        self.client_id = DEFAULT_CLIENT_ID
        self._client: Optional[httpx.AsyncClient] = None
        self._semaphore = asyncio.Semaphore(3)
        self._last_request = 0.0

    async def __aenter__(self) -> "SoundCloudScraper":
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "application/json",
                "Origin": "https://soundcloud.com",
                "Referer": "https://soundcloud.com/",
            },
        )
        # Auto-refresh client_id on startup — hardcoded default goes stale
        await self._refresh_id()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._client:
            await self._client.aclose()

    async def _get(self, url: str, params: dict = None) -> httpx.Response:
        """Throttled request with 429 retry and exponential backoff."""
        async with self._semaphore:
            now = asyncio.get_event_loop().time()
            wait = 0.5 - (now - self._last_request)
            if wait > 0:
                await asyncio.sleep(wait + random.uniform(0.1, 0.3))

            for attempt in range(4):
                self._last_request = asyncio.get_event_loop().time()
                resp = await self._client.get(url, params=params)
                if resp.status_code != 429:
                    return resp
                backoff = (2 ** attempt) + random.uniform(0.5, 1.5)
                logger.warning(f"Rate limited, waiting {backoff:.1f}s")
                await asyncio.sleep(backoff)
            return resp

    # ── Single artist scrape ──────────────────────────────────────────

    async def scrape(self, url: str) -> ScrapedArtist:
        """Scrape one SoundCloud profile."""
        clean = normalize_url(url)
        try:
            user = await self._resolve(clean)
            if not user:
                raise ValueError("Could not resolve profile")

            web_profiles = await self._web_profiles(user["id"])
            result = build_artist(user, clean, web_profiles)

            # Try email from linked sites if bio didn't have one
            if not result.email:
                email, source = await find_email_from_links(self._client, user, web_profiles)
                if email:
                    result.email = email
                    result.email_source = source

            # Fetch latest track info
            track = await self._get_latest_track(user["id"])
            if track:
                result.latest_track_title = track.get("title")
                result.latest_track_url = track.get("permalink_url")
                result.latest_track_plays = track.get("playback_count")

            result.success = True
            logger.info(f"OK: {result.name} ({result.followers} followers, email={'yes' if result.email else 'no'})")
            return result
        except Exception as e:
            logger.error(f"FAIL: {url} — {e}")
            return ScrapedArtist(name=name_from_url(url), soundcloud_url=clean, error=str(e))

    # ── Discovery ─────────────────────────────────────────────────────

    async def discover(
        self,
        seed_url: str,
        min_followers: int = 0,
        max_followers: int = 999_999_999,
        genres: Optional[list[str]] = None,
        max_results: int = 50,
        uploaded_within_days: Optional[int] = None,
    ) -> dict:
        """Find artists similar to a seed profile."""
        clean = normalize_url(seed_url)
        seed = await self._resolve(clean)
        if not seed:
            return {"results": [], "error": "Could not resolve seed"}

        seed_id = seed["id"]
        seed_name = seed.get("username", "Unknown")
        seed_genre = seed.get("genre", "")

        queries = _build_search_queries(seed_name, genres, seed_genre)
        genre_tags = _build_genre_tags(genres or ([seed_genre] if seed_genre else []))

        # Fan out: related + paginated followings/followers + search + tag searches
        tasks = [
            self._related(seed_id),
            self._followings_paginated(seed_id),
            self._followers_paginated(seed_id),
        ]
        for q in queries:
            tasks.append(self._search_paginated(q))
        for tag in genre_tags:
            tasks.append(self._search_tracks_by_tag(tag))

        raw = await asyncio.gather(*tasks, return_exceptions=True)

        seen = {seed_id}
        candidates = []
        for r in raw:
            if isinstance(r, Exception):
                continue
            for u in (r or []):
                uid = u.get("id")
                if uid and uid not in seen:
                    seen.add(uid)
                    candidates.append(u)

        # 2nd-degree connections from top 3
        if candidates:
            top3 = sorted(candidates, key=lambda u: u.get("followers_count", 0) or 0, reverse=True)[:3]
            tasks2 = []
            for u in top3:
                uid = u.get("id")
                if uid:
                    tasks2.append(self._related(uid))
                    tasks2.append(self._followings(uid))
            if tasks2:
                raw2 = await asyncio.gather(*tasks2, return_exceptions=True)
                for r in raw2:
                    if isinstance(r, Exception):
                        continue
                    for u in (r or []):
                        uid = u.get("id")
                        if uid and uid not in seen:
                            seen.add(uid)
                            candidates.append(u)

        filtered, stats = _filter_candidates(candidates, min_followers, max_followers, uploaded_within_days)
        filtered.sort(key=lambda u: u.get("followers_count", 0) or 0, reverse=True)
        filtered = filtered[:max_results]

        return {
            "results": [user_summary(u) for u in filtered],
            "total_found": len(candidates),
            "filtered_count": len(filtered),
            "seed_artist": seed_name,
            "filter_stats": stats,
        }

    # ── SC API wrappers ───────────────────────────────────────────────

    async def _resolve(self, sc_url: str) -> Optional[dict]:
        params = {"url": sc_url, "client_id": self.client_id}
        resp = await self._get(f"{SC_API}/resolve", params)
        if resp.status_code == 401:
            if await self._refresh_id():
                params["client_id"] = self.client_id
                resp = await self._get(f"{SC_API}/resolve", params)
        if resp.status_code == 404:
            raise ValueError(f"Not found: {sc_url}")
        resp.raise_for_status()
        data = resp.json()
        if data.get("kind") == "user":
            return data
        if data.get("user"):
            return data["user"]
        raise ValueError(f"Resolved to '{data.get('kind')}', not a user")

    async def _search(self, query: str, limit: int = 200) -> list[dict]:
        params = {"q": query, "client_id": self.client_id, "limit": limit}
        try:
            resp = await self._get(f"{SC_API}/search/users", params)
            if resp.status_code == 401:
                await self._refresh_id()
                params["client_id"] = self.client_id
                resp = await self._get(f"{SC_API}/search/users", params)
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception:
            return []

    async def _related(self, uid: int) -> list[dict]:
        try:
            resp = await self._get(f"{SC_API}/users/{uid}/relatedartists", {"client_id": self.client_id, "limit": 50})
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception:
            return []

    async def _followings(self, uid: int) -> list[dict]:
        try:
            resp = await self._get(f"{SC_API}/users/{uid}/followings", {"client_id": self.client_id, "limit": 200})
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception:
            return []

    async def _followers(self, uid: int) -> list[dict]:
        try:
            resp = await self._get(f"{SC_API}/users/{uid}/followers", {"client_id": self.client_id, "limit": 200})
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception:
            return []

    # ── Paginated helpers ──────────────────────────────────────────

    async def _paginated_fetch(self, url: str, params: dict, max_pages: int = 3, limit: int = 200) -> list[dict]:
        """Follow SC's next_href cursor pagination."""
        all_items: list[dict] = []
        params = {**params, "client_id": self.client_id, "limit": limit}
        for _ in range(max_pages):
            try:
                resp = await self._get(url, params)
                if resp.status_code == 401:
                    await self._refresh_id()
                    params["client_id"] = self.client_id
                    resp = await self._get(url, params)
                if resp.status_code != 200:
                    break
                data = resp.json()
                collection = data.get("collection", [])
                all_items.extend(collection)
                if not collection:
                    break
                next_href = data.get("next_href")
                if not next_href:
                    break
                url = next_href.split("?")[0]
                parsed = urlparse(next_href)
                params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
                params["client_id"] = self.client_id
            except Exception:
                break
        return all_items

    async def _followings_paginated(self, uid: int, max_pages: int = 3) -> list[dict]:
        try:
            return await self._paginated_fetch(f"{SC_API}/users/{uid}/followings", {}, max_pages=max_pages)
        except Exception:
            return []

    async def _followers_paginated(self, uid: int, max_pages: int = 3) -> list[dict]:
        try:
            return await self._paginated_fetch(f"{SC_API}/users/{uid}/followers", {}, max_pages=max_pages)
        except Exception:
            return []

    async def _search_paginated(self, query: str) -> list[dict]:
        try:
            return await self._paginated_fetch(f"{SC_API}/search/users", {"q": query}, max_pages=2)
        except Exception:
            return []

    async def _search_tracks_by_tag(self, tag: str, limit: int = 200) -> list[dict]:
        """Search tracks by tag, extract unique artist user objects."""
        try:
            params = {"q": tag, "client_id": self.client_id, "limit": limit}
            resp = await self._get(f"{SC_API}/search/tracks", params)
            if resp.status_code == 401:
                await self._refresh_id()
                params["client_id"] = self.client_id
                resp = await self._get(f"{SC_API}/search/tracks", params)
            if resp.status_code != 200:
                return []
            tracks = resp.json().get("collection", [])
            seen_ids: set[int] = set()
            users: list[dict] = []
            for track in tracks:
                user = track.get("user")
                if user:
                    uid = user.get("id")
                    if uid and uid not in seen_ids:
                        seen_ids.add(uid)
                        users.append(user)
            return users
        except Exception:
            return []

    async def _web_profiles(self, user_id: int) -> list[dict]:
        try:
            resp = await self._get(
                f"{SC_API}/users/soundcloud:users:{user_id}/web-profiles",
                {"client_id": self.client_id},
            )
            if resp.status_code == 200:
                return resp.json()
            return []
        except Exception:
            return []

    async def _get_latest_track(self, user_id: int) -> Optional[dict]:
        """Fetch most recent track. Tries /stream then /toptracks."""
        if not user_id:
            return None
        # Try stream endpoint first (chronological)
        try:
            resp = await self._get(
                f"{SC_API}/stream/users/{user_id}",
                {"client_id": self.client_id, "limit": 10},
            )
            if resp.status_code == 200:
                for item in resp.json().get("collection", []):
                    if item.get("type") == "track" and item.get("track"):
                        return item["track"]
        except Exception:
            pass
        # Fallback: top tracks sorted by recency
        try:
            resp = await self._get(
                f"{SC_API}/users/{user_id}/toptracks",
                {"client_id": self.client_id, "limit": 5},
            )
            if resp.status_code == 200:
                tracks = resp.json().get("collection", [])
                if tracks:
                    tracks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
                    return tracks[0]
        except Exception:
            pass
        return None

    async def _refresh_id(self) -> bool:
        """Scrape a fresh client_id from SoundCloud's JS bundles."""
        try:
            html = await self._client.get("https://soundcloud.com/", headers={"Accept": "text/html"})
            if html.status_code != 200:
                return False
            for script_url in re.findall(r'src="(https://a-v2\.sndcdn\.com/assets/[^"]+\.js)"', html.text)[-3:]:
                js = await self._client.get(script_url)
                if js.status_code == 200:
                    m = re.search(r'client_id:"([a-zA-Z0-9]+)"', js.text)
                    if m:
                        self.client_id = m.group(1)
                        logger.info(f"Refreshed client_id: {self.client_id[:8]}...")
                        return True
            return False
        except Exception:
            return False


# ── Pure helpers ─────────────────────────────────────────────────────


def _build_search_queries(seed_name: str, genres: Optional[list[str]], seed_genre: str) -> list[str]:
    """Build expanded search queries from seed name + genres + variants."""
    queries = [seed_name]
    base_genres = genres or ([seed_genre] if seed_genre else [])
    for g in base_genres:
        gl = g.lower().strip()
        if gl and gl not in [q.lower() for q in queries]:
            queries.append(g)
        for variant in GENRE_VARIANTS.get(gl, []):
            if variant.lower() not in [q.lower() for q in queries]:
                queries.append(variant)
    return queries[:8]


def _build_genre_tags(genres: list[str]) -> list[str]:
    """Build genre tags list for track searches."""
    tags: list[str] = []
    for g in genres:
        gl = g.lower().strip()
        if gl and gl not in tags:
            tags.append(gl)
        for variant in GENRE_VARIANTS.get(gl, []):
            if variant.lower() not in tags:
                tags.append(variant.lower())
    return tags[:4]


def _filter_candidates(
    candidates: list[dict],
    min_followers: int,
    max_followers: int,
    uploaded_within_days: Optional[int],
) -> tuple[list[dict], dict]:
    """Filter candidates by followers, tracks, recency. Returns (filtered, stats)."""
    cutoff = None
    if uploaded_within_days:
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=uploaded_within_days)

    stats = {"total_raw": len(candidates), "below_min": 0, "above_max": 0, "no_tracks": 0, "too_old": 0, "passed": 0}
    filtered = []

    for u in candidates:
        fc = u.get("followers_count", 0) or 0
        tc = u.get("track_count", 0) or 0
        if fc < min_followers:
            stats["below_min"] += 1
            continue
        if fc > max_followers:
            stats["above_max"] += 1
            continue
        if tc < 1:
            stats["no_tracks"] += 1
            continue
        if cutoff:
            last_mod = u.get("last_modified")
            if last_mod:
                try:
                    mod_dt = datetime.datetime.fromisoformat(last_mod.replace("Z", "+00:00"))
                    if mod_dt < cutoff:
                        stats["too_old"] += 1
                        continue
                except (ValueError, TypeError):
                    pass
        stats["passed"] += 1
        filtered.append(u)

    return filtered, stats
