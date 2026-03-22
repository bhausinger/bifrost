# Lead Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SoundCloud artist discovery tool and replace the mock scraper with a real API-based implementation.

**Architecture:** Python scraper gets rewritten to use SoundCloud's public API (api-v2.soundcloud.com) for both discovery and scraping. Dashboard gets a new LeadGeneratorModal with a 4-step flow (configure → discover → review/scrape → import). Blocked terms stored in Supabase, managed via Settings page.

**Tech Stack:** Python/FastAPI/httpx (scraper), React/TypeScript/Tailwind (dashboard), Supabase (database)

**Spec:** `docs/superpowers/specs/2026-03-21-lead-generator-design.md`

---

## File Map

### Scraper (Python)
- **Rewrite:** `apps/scraper/src/services/soundcloud_scraper.py` — replace mock BeautifulSoup scraper with SoundCloud API client
- **Rewrite:** `apps/scraper/src/api/routes/soundcloud.py` — simplify to `/scrape` endpoint matching ScraperModal expectations
- **Rewrite:** `apps/scraper/src/api/routes/discovery.py` — single `/discover` endpoint
- **Modify:** `apps/scraper/src/main.py` — add `/scrape/soundcloud` compatibility route
- **Delete:** `apps/scraper/src/services/artist_discovery.py` — OpenAI stub, no longer needed
- **Modify:** `apps/scraper/src/models/schemas.py` — add ArtistData and DiscoverRequest models

### Dashboard (React)
- **Create:** `apps/dashboard/src/components/pipeline/LeadGeneratorModal.tsx` — 4-step discovery modal
- **Modify:** `apps/dashboard/src/pages/Pipeline.tsx` — add "Discover Artists" button
- **Modify:** `apps/dashboard/src/pages/Settings.tsx` — add blocked terms section
- **Create:** `apps/dashboard/src/hooks/useBlockedTerms.ts` — Supabase CRUD for blocked terms

### Database
- **Create:** `supabase/migrations/00004_blocked_terms.sql` — blocked_terms table

---

## Task 1: Rewrite SoundCloud Scraper

**Files:**
- Rewrite: `apps/scraper/src/services/soundcloud_scraper.py`

This is the core engine. Replace the mock BeautifulSoup scraper with TempoV3's API-based approach using httpx and SoundCloud's public API.

- [ ] **Step 1: Write the new SoundCloudScraper class**

Replace the entire file with the API-based scraper. Key capabilities:
- Uses `api-v2.soundcloud.com` with client_id (no browser needed)
- Throttled requests via semaphore (max 3 concurrent) + minimum 500ms interval
- 429 retry with exponential backoff
- `scrape_artist(url)` — resolve user → get latest track → extract email from bio → build response
- `scrape_multiple_artists(urls)` — sequential with delays
- `discover_artists(seed_url, filters)` — multi-source candidate gathering → dedup → filter → return
- Helper methods: search_users, search_tracks_by_tag, get_related_artists, get_user_followings/followers (paginated), get_user_tracks
- Utility methods: _normalize_url, _extract_email_from_text, _categorize_link, _resolve_user, _refresh_client_id, _build_artist_data

```python
#!/usr/bin/env python3
"""
SoundCloud Scraper using SoundCloud's public API (api-v2.soundcloud.com).

Uses the same client_id that SoundCloud's own frontend uses to make API calls.
No browser/Playwright needed — just HTTP requests. Fast and accurate.
"""
import re
import asyncio
import random
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import httpx

logger = logging.getLogger(__name__)

# SoundCloud's public client_id (embedded in their frontend JS)
DEFAULT_CLIENT_ID = "MNAdchLuJ5WsWAIfPAFVcs0qcO3aGNcT"
SC_API_BASE = "https://api-v2.soundcloud.com"


@dataclass
class ArtistData:
    artist_name: str
    soundcloud_url: str
    email: Optional[str] = None
    followers: Optional[int] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    social_links: Dict[str, str] = field(default_factory=dict)
    track_count: Optional[int] = None
    most_recent_upload_date: Optional[str] = None
    most_recent_song_title: Optional[str] = None
    most_recent_song_url: Optional[str] = None
    total_plays: Optional[int] = None
    total_likes: Optional[int] = None
    profile_image_url: Optional[str] = None
    success: bool = False
    error_message: Optional[str] = None


class SoundCloudScraper:
    def __init__(self):
        self.client_id = DEFAULT_CLIENT_ID
        self._client: Optional[httpx.AsyncClient] = None
        self._semaphore = asyncio.Semaphore(3)
        self._last_request_time = 0.0
        self._min_request_interval = 0.5

    async def __aenter__(self):
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
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()

    async def _api_get(self, url: str, params: dict = None) -> httpx.Response:
        """Central throttled API request method with rate-limit handling."""
        async with self._semaphore:
            loop = asyncio.get_running_loop()
            now = loop.time()
            elapsed = now - self._last_request_time
            if elapsed < self._min_request_interval:
                await asyncio.sleep(self._min_request_interval - elapsed + random.uniform(0.1, 0.4))

            for attempt in range(4):
                self._last_request_time = loop.time()
                response = await self._client.get(url, params=params)
                if response.status_code == 429:
                    wait = (2 ** attempt) + random.uniform(0.5, 1.5)
                    logger.warning(f"SC rate limited (429), backing off {wait:.1f}s (attempt {attempt+1})")
                    await asyncio.sleep(wait)
                    continue
                return response

            return response

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def scrape_artist(self, url: str) -> ArtistData:
        """Scrape a single SoundCloud artist profile via the API."""
        try:
            clean_url = self._normalize_url(url)
            logger.info(f"Resolving {clean_url}")

            user = await self._resolve_user(clean_url)
            if not user:
                raise Exception("Could not resolve SoundCloud profile")

            user_id = user.get("id")
            username = user.get("username", "Unknown")
            logger.info(f"Resolved user: {username} (id={user_id})")

            recent_track = await self._get_latest_track(user_id)
            web_profiles = await self.get_web_profiles(user_id)
            artist = self._build_artist_data(user, clean_url, recent_track, web_profiles)
            artist.success = True
            return artist

        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            clean_name = self._extract_artist_name_from_url(url)
            return ArtistData(
                artist_name=clean_name,
                soundcloud_url=self._normalize_url(url),
                success=False,
                error_message=str(e),
            )

    async def scrape_multiple_artists(self, urls: List[str]) -> List[ArtistData]:
        """Scrape multiple artists sequentially with brief delays."""
        results = []
        for i, url in enumerate(urls):
            logger.info(f"Scraping {i + 1}/{len(urls)}: {url}")
            result = await self.scrape_artist(url)
            results.append(result)
            if i < len(urls) - 1:
                await asyncio.sleep(random.uniform(1.0, 2.0))
        return results

    # ------------------------------------------------------------------
    # Discovery methods
    # ------------------------------------------------------------------

    async def search_users(self, query: str, limit: int = 50, offset: int = 0) -> List[dict]:
        """Search SoundCloud users by query."""
        url = f"{SC_API_BASE}/search/users"
        params = {"q": query, "client_id": self.client_id, "limit": min(limit, 200), "offset": offset}
        try:
            resp = await self._api_get(url, params=params)
            if resp.status_code == 401:
                await self._refresh_client_id()
                params["client_id"] = self.client_id
                resp = await self._api_get(url, params=params)
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception as e:
            logger.warning(f"search_users failed: {e}")
            return []

    async def search_tracks_by_tag(self, tag: str, limit: int = 50) -> List[dict]:
        """Search tracks by tag/genre, extract unique artists."""
        url = f"{SC_API_BASE}/search/tracks"
        formatted_tag = tag.lower().replace(" ", "-") if " " in tag else tag.lower()
        params = {
            "q": f"#{formatted_tag}",
            "client_id": self.client_id,
            "limit": min(limit, 200),
            "filter.genre_or_tag": formatted_tag,
        }
        try:
            resp = await self._api_get(url, params=params)
            if resp.status_code == 401:
                await self._refresh_client_id()
                params["client_id"] = self.client_id
                resp = await self._api_get(url, params=params)
            resp.raise_for_status()
            tracks = resp.json().get("collection", [])
            seen_ids = set()
            users = []
            for track in tracks:
                user = track.get("user")
                if user and user.get("id") not in seen_ids:
                    seen_ids.add(user.get("id"))
                    users.append(user)
            return users
        except Exception as e:
            logger.warning(f"search_tracks_by_tag failed for {tag}: {e}")
            return []

    async def get_related_artists(self, user_id: int, limit: int = 50) -> List[dict]:
        """Get related artists from SoundCloud's recommendation engine."""
        url = f"{SC_API_BASE}/users/{user_id}/relatedartists"
        params = {"client_id": self.client_id, "limit": min(limit, 50)}
        try:
            resp = await self._api_get(url, params=params)
            if resp.status_code == 401:
                await self._refresh_client_id()
                params["client_id"] = self.client_id
                resp = await self._api_get(url, params=params)
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception as e:
            logger.warning(f"get_related_artists failed: {e}")
            return []

    async def get_user_followings(self, user_id: int, limit: int = 50) -> List[dict]:
        """Get who a user follows."""
        url = f"{SC_API_BASE}/users/{user_id}/followings"
        params = {"client_id": self.client_id, "limit": min(limit, 200)}
        try:
            resp = await self._api_get(url, params=params)
            if resp.status_code == 401:
                await self._refresh_client_id()
                params["client_id"] = self.client_id
                resp = await self._api_get(url, params=params)
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception as e:
            logger.warning(f"get_user_followings failed: {e}")
            return []

    async def get_user_followers(self, user_id: int, limit: int = 50) -> List[dict]:
        """Get a user's followers."""
        url = f"{SC_API_BASE}/users/{user_id}/followers"
        params = {"client_id": self.client_id, "limit": min(limit, 200)}
        try:
            resp = await self._api_get(url, params=params)
            if resp.status_code == 401:
                await self._refresh_client_id()
                params["client_id"] = self.client_id
                resp = await self._api_get(url, params=params)
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception as e:
            logger.warning(f"get_user_followers failed: {e}")
            return []

    async def get_user_followings_paginated(self, user_id: int, max_pages: int = 5) -> List[dict]:
        """Get who a user follows with pagination."""
        all_results = []
        url = f"{SC_API_BASE}/users/{user_id}/followings"
        params = {"client_id": self.client_id, "limit": 200}

        for page in range(max_pages):
            try:
                resp = await self._api_get(url, params=params)
                if resp.status_code == 401:
                    await self._refresh_client_id()
                    params["client_id"] = self.client_id
                    resp = await self._api_get(url, params=params)
                if resp.status_code != 200:
                    break
                data = resp.json()
                collection = data.get("collection", [])
                if not collection:
                    break
                all_results.extend(collection)
                next_href = data.get("next_href")
                if not next_href:
                    break
                url = next_href
                params = {}
            except Exception as e:
                logger.warning(f"get_user_followings_paginated page {page} failed: {e}")
                break

        return all_results

    async def get_user_followers_paginated(self, user_id: int, max_pages: int = 5) -> List[dict]:
        """Get a user's followers with pagination."""
        all_results = []
        url = f"{SC_API_BASE}/users/{user_id}/followers"
        params = {"client_id": self.client_id, "limit": 200}

        for page in range(max_pages):
            try:
                resp = await self._api_get(url, params=params)
                if resp.status_code == 401:
                    await self._refresh_client_id()
                    params["client_id"] = self.client_id
                    resp = await self._api_get(url, params=params)
                if resp.status_code != 200:
                    break
                data = resp.json()
                collection = data.get("collection", [])
                if not collection:
                    break
                all_results.extend(collection)
                next_href = data.get("next_href")
                if not next_href:
                    break
                url = next_href
                params = {}
            except Exception as e:
                logger.warning(f"get_user_followers_paginated page {page} failed: {e}")
                break

        return all_results

    async def get_web_profiles(self, user_id: int) -> List[dict]:
        """Get a user's linked social profiles (instagram, twitter, spotify, etc.)."""
        url = f"{SC_API_BASE}/users/soundcloud:users:{user_id}/web-profiles"
        params = {"client_id": self.client_id}
        try:
            resp = await self._api_get(url, params=params)
            if resp.status_code == 401:
                await self._refresh_client_id()
                params["client_id"] = self.client_id
                resp = await self._api_get(url, params=params)
            if resp.status_code != 200:
                return []
            return resp.json() if isinstance(resp.json(), list) else resp.json().get("collection", [])
        except Exception as e:
            logger.warning(f"get_web_profiles failed: {e}")
            return []

    async def get_user_tracks(self, user_id: int, limit: int = 10) -> List[dict]:
        """Get a user's tracks."""
        url = f"{SC_API_BASE}/users/{user_id}/tracks"
        params = {"client_id": self.client_id, "limit": limit}
        try:
            resp = await self._api_get(url, params=params)
            if resp.status_code == 401:
                await self._refresh_client_id()
                params["client_id"] = self.client_id
                resp = await self._api_get(url, params=params)
            resp.raise_for_status()
            return resp.json().get("collection", [])
        except Exception as e:
            logger.warning(f"get_user_tracks failed: {e}")
            return []

    async def discover_artists(
        self,
        seed_url: str,
        min_followers: int = 0,
        max_followers: int = 999999999,
        genres: Optional[List[str]] = None,
        uploaded_within_days: Optional[int] = None,
        max_results: int = 50,
    ) -> dict:
        """
        Discover artists similar to a seed artist, filtered by criteria.
        Casts a wide net using multiple strategies then filters down.
        Returns lightweight metadata (no full scrape).
        """
        from datetime import datetime, timezone, timedelta

        logger.info(f"Discovering artists similar to {seed_url}")

        # Step 1: Resolve seed artist
        clean_url = self._normalize_url(seed_url)
        seed_user = await self._resolve_user(clean_url)
        if not seed_user:
            return {"results": [], "total_found": 0, "filtered_count": 0, "error": "Could not resolve seed artist"}

        seed_id = seed_user.get("id")
        seed_name = seed_user.get("username", "Unknown")
        seed_genre = seed_user.get("genre", "")
        logger.info(f"Seed artist: {seed_name} (id={seed_id}, genre={seed_genre})")

        # Step 2: Gather candidates from multiple sources in parallel
        search_genres = genres if genres else ([seed_genre] if seed_genre else [])

        # Build search queries with genre variants
        search_queries = [seed_name]
        genre_variants = {
            "electronic": ["edm", "bass music", "electronic music"],
            "edm": ["electronic", "dance music", "electronic music"],
            "hip hop": ["hip-hop", "rap", "trap"],
            "hip-hop": ["hip hop", "rap", "trap"],
            "rap": ["hip hop", "hip-hop", "trap"],
            "trap": ["trap music", "hip hop", "bass"],
            "house": ["deep house", "tech house", "house music"],
            "techno": ["tech house", "minimal techno", "techno music"],
            "dubstep": ["bass music", "dubstep music", "riddim"],
            "bass": ["bass music", "dubstep", "experimental bass"],
            "dnb": ["drum and bass", "jungle", "liquid dnb"],
            "drum and bass": ["dnb", "jungle", "liquid dnb"],
            "drum & bass": ["dnb", "jungle", "liquid dnb"],
            "pop": ["pop music", "indie pop", "electropop"],
            "r&b": ["rnb", "r&b music", "soul"],
            "indie": ["indie music", "indie rock", "indie pop"],
            "rock": ["indie rock", "alternative rock", "rock music"],
            "lo-fi": ["lofi", "lo-fi hip hop", "chillhop"],
            "lofi": ["lo-fi", "lofi hip hop", "chillhop"],
            "ukg": ["uk garage", "garage", "2-step"],
            "uk garage": ["ukg", "garage", "2-step"],
            "jungle": ["dnb", "drum and bass", "breakbeat"],
            "grime": ["uk rap", "grime music", "uk hip hop"],
            "afrobeats": ["afro", "afropop", "african music"],
            "amapiano": ["afrobeats", "south african house", "deep house"],
        }

        for search_genre in search_genres:
            search_queries.append(search_genre)
            for variant in genre_variants.get(search_genre.lower(), []):
                if variant.lower() != search_genre.lower():
                    search_queries.append(variant)

        # Deduplicate queries
        seen_queries = set()
        unique_queries = []
        for q in search_queries:
            ql = q.lower().strip()
            if ql and ql not in seen_queries:
                seen_queries.add(ql)
                unique_queries.append(q)

        logger.info(f"Running {len(unique_queries)} search queries + related/followings/followers")

        # Run all sources concurrently
        tasks = []
        tasks.append(("related", self.get_related_artists(seed_id, limit=50)))
        tasks.append(("followings", self.get_user_followings_paginated(seed_id, max_pages=3)))
        tasks.append(("followers", self.get_user_followers_paginated(seed_id, max_pages=3)))

        for q in unique_queries[:8]:
            tasks.append((f"search:{q}:0", self.search_users(q, limit=200, offset=0)))
            tasks.append((f"search:{q}:200", self.search_users(q, limit=200, offset=200)))

        for genre in search_genres[:4]:
            tasks.append((f"tag:{genre}", self.search_tracks_by_tag(genre, limit=200)))

        all_users = []
        task_names = [t[0] for t in tasks]
        task_coros = [t[1] for t in tasks]
        results_list = await asyncio.gather(*task_coros, return_exceptions=True)

        for name, result in zip(task_names, results_list):
            if isinstance(result, Exception):
                logger.warning(f"{name} failed: {result}")
                continue
            if result:
                all_users.extend(result)

        # Step 3: 2nd-degree expansion
        first_degree_related = results_list[0] if not isinstance(results_list[0], Exception) else []
        if first_degree_related and len(first_degree_related) > 0:
            second_degree_tasks = []
            for rel_user in first_degree_related[:3]:
                rel_id = rel_user.get("id")
                if rel_id:
                    second_degree_tasks.append(self.get_related_artists(rel_id, limit=30))
                    second_degree_tasks.append(self.get_user_followings(rel_id, limit=50))

            if second_degree_tasks:
                second_results = await asyncio.gather(*second_degree_tasks, return_exceptions=True)
                for sr in second_results:
                    if isinstance(sr, list):
                        all_users.extend(sr)

        # Step 4: Deduplicate by user ID
        seen_ids = {seed_id}
        candidates = []
        for user in all_users:
            uid = user.get("id")
            if uid and uid not in seen_ids:
                seen_ids.add(uid)
                candidates.append(user)

        total_found = len(candidates)

        # Step 5: Apply filters
        upload_cutoff = None
        if uploaded_within_days and uploaded_within_days > 0:
            upload_cutoff = datetime.now(timezone.utc) - timedelta(days=uploaded_within_days)

        filtered = []
        filter_stats = {"followers_low": 0, "followers_high": 0, "no_tracks": 0, "too_old": 0}

        for user in candidates:
            followers = user.get("followers_count", 0) or 0
            if followers < min_followers:
                filter_stats["followers_low"] += 1
                continue
            if followers > max_followers:
                filter_stats["followers_high"] += 1
                continue

            track_count = user.get("track_count", 0) or 0
            if track_count < 1:
                filter_stats["no_tracks"] += 1
                continue

            if upload_cutoff:
                last_modified = user.get("last_modified")
                if last_modified:
                    try:
                        last_dt = datetime.fromisoformat(last_modified.replace("Z", "+00:00"))
                        if last_dt < upload_cutoff:
                            filter_stats["too_old"] += 1
                            continue
                    except Exception:
                        pass

            filtered.append(user)

        # Sort by followers descending
        filtered.sort(key=lambda u: u.get("followers_count", 0) or 0, reverse=True)
        filtered = filtered[:max_results]

        logger.info(f"{len(filtered)} artists passed filters (from {total_found} candidates)")

        # Step 6: Build lightweight results
        results = []
        for user in filtered:
            avatar = user.get("avatar_url", "")
            if avatar:
                avatar = avatar.replace("-large.", "-t200x200.")

            permalink = user.get("permalink", "")
            sc_url = f"https://soundcloud.com/{permalink}" if permalink else ""

            results.append({
                "name": user.get("username") or user.get("full_name") or "Unknown",
                "url": sc_url,
                "followers": user.get("followers_count", 0),
                "track_count": user.get("track_count", 0),
                "genre": user.get("genre", ""),
                "last_modified": user.get("last_modified", ""),
                "avatar_url": avatar,
                "city": user.get("city", ""),
                "country": user.get("country_code", ""),
                "sc_user_id": user.get("id"),
            })

        return {
            "results": results,
            "total_found": total_found,
            "filtered_count": len(filtered),
            "seed_artist": seed_name,
            "seed_genre": seed_genre,
            "filter_stats": filter_stats,
        }

    # ------------------------------------------------------------------
    # API helpers
    # ------------------------------------------------------------------

    async def _resolve_user(self, sc_url: str) -> Optional[dict]:
        """Use the /resolve endpoint to get user data from a SoundCloud URL."""
        resolve_url = f"{SC_API_BASE}/resolve"
        params = {"url": sc_url, "client_id": self.client_id}

        try:
            resp = await self._api_get(resolve_url, params=params)
            if resp.status_code == 404:
                raise Exception(f"Profile not found: {sc_url}")
            if resp.status_code == 401:
                new_id = await self._refresh_client_id()
                if new_id:
                    params["client_id"] = new_id
                    resp = await self._api_get(resolve_url, params=params)
                else:
                    raise Exception("SoundCloud API authentication failed — client_id may have expired")
            resp.raise_for_status()
            data = resp.json()

            if data.get("kind") == "user":
                return data
            if data.get("user"):
                return data["user"]

            raise Exception(f"URL did not resolve to a user profile (kind={data.get('kind')})")
        except httpx.HTTPStatusError as e:
            raise Exception(f"SoundCloud API error: {e.response.status_code}")

    async def _get_latest_track(self, user_id: int) -> Optional[dict]:
        """Fetch the most recent original track for a user."""
        if not user_id:
            return None

        # Try 1: Stream endpoint
        try:
            url = f"{SC_API_BASE}/stream/users/{user_id}"
            params = {"client_id": self.client_id, "limit": 10}
            resp = await self._api_get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("collection", []):
                    if item.get("type") == "track":
                        track = item.get("track")
                        if track:
                            return track
        except Exception as e:
            logger.warning(f"Stream endpoint failed for user {user_id}: {e}")

        # Try 2: Top tracks endpoint
        try:
            url = f"{SC_API_BASE}/users/{user_id}/toptracks"
            params = {"client_id": self.client_id, "limit": 5}
            resp = await self._api_get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                tracks = data.get("collection", [])
                if tracks:
                    tracks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
                    return tracks[0]
        except Exception as e:
            logger.warning(f"Toptracks endpoint failed for user {user_id}: {e}")

        return None

    async def _refresh_client_id(self) -> Optional[str]:
        """Try to extract a fresh client_id from SoundCloud's JS bundles."""
        try:
            logger.info("Attempting to refresh client_id...")
            resp = await self._client.get("https://soundcloud.com/", headers={"Accept": "text/html"})
            if resp.status_code != 200:
                return None

            scripts = re.findall(r'src="(https://a-v2\.sndcdn\.com/assets/[^"]+\.js)"', resp.text)
            for script_url in scripts[-3:]:
                try:
                    js_resp = await self._client.get(script_url)
                    if js_resp.status_code == 200:
                        match = re.search(r'client_id:"([a-zA-Z0-9]+)"', js_resp.text)
                        if match:
                            new_id = match.group(1)
                            logger.info(f"Found new client_id: {new_id[:8]}...")
                            self.client_id = new_id
                            return new_id
                except Exception:
                    continue
            return None
        except Exception as e:
            logger.warning(f"Failed to refresh client_id: {e}")
            return None

    # ------------------------------------------------------------------
    # Data builders
    # ------------------------------------------------------------------

    def _build_artist_data(self, user: dict, sc_url: str, recent_track: Optional[dict], web_profiles: Optional[List[dict]] = None) -> ArtistData:
        """Build an ArtistData object from the API response."""
        artist_name = user.get("username") or user.get("full_name") or "Unknown"
        followers = user.get("followers_count")
        track_count = user.get("track_count")
        location = self._extract_location(user)
        bio = user.get("description")
        avatar = user.get("avatar_url")

        if avatar:
            avatar = avatar.replace("-large.", "-t500x500.")

        # Build social links from web-profiles API + website field
        social_links = {}
        if web_profiles:
            for profile in web_profiles:
                profile_url = profile.get("url", "")
                if profile_url:
                    self._categorize_link(profile_url, social_links)
        website = user.get("website")
        if website:
            self._categorize_link(website, social_links)

        email = None
        if bio:
            email = self._extract_email_from_text(bio)

        most_recent_title = None
        most_recent_url = None
        most_recent_date = None
        if recent_track:
            most_recent_title = recent_track.get("title")
            permalink_url = recent_track.get("permalink_url")
            if permalink_url:
                most_recent_url = permalink_url
            created_at = recent_track.get("created_at") or recent_track.get("display_date")
            if created_at:
                most_recent_date = self._relative_time(created_at)

        return ArtistData(
            artist_name=artist_name,
            soundcloud_url=sc_url,
            email=email,
            followers=followers,
            location=location,
            bio=bio,
            social_links=social_links,
            track_count=track_count,
            most_recent_upload_date=most_recent_date,
            most_recent_song_title=most_recent_title,
            most_recent_song_url=most_recent_url,
            total_plays=None,
            total_likes=None,
            profile_image_url=avatar,
        )

    def _extract_location(self, user: dict) -> Optional[str]:
        """Extract location from API user object."""
        city = user.get("city")
        country = user.get("country_code")
        if city and country:
            return f"{city}, {country}"
        return city or country or None

    # ------------------------------------------------------------------
    # Utility methods
    # ------------------------------------------------------------------

    def _normalize_url(self, url: str) -> str:
        """Clean and normalize SoundCloud URL."""
        url = url.strip()
        if url.lower().startswith("soundcloud.com/"):
            return f"https://{url}"
        if url.startswith("http"):
            return url
        username = url.strip("@").strip("/")
        return f"https://soundcloud.com/{username}"

    def _extract_artist_name_from_url(self, url: str) -> str:
        """Extract a clean artist name from a SoundCloud URL."""
        normalized = url.strip().rstrip("/")
        if "soundcloud.com/" in normalized.lower():
            idx = normalized.lower().index("soundcloud.com/")
            username = normalized[idx + len("soundcloud.com/"):].split("/")[0]
        elif normalized.startswith("http"):
            parts = normalized.split("/")
            username = parts[-1] if parts else normalized
        else:
            username = normalized.strip("@").strip("/")
        cleaned = username.replace("-", " ").replace("_", " ")
        return " ".join(word.capitalize() for word in cleaned.split())

    def _extract_email_from_text(self, text: str) -> Optional[str]:
        """Extract email address from text using regex."""
        if not text:
            return None
        pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
        emails = re.findall(pattern, text)
        return emails[0] if emails else None

    def _categorize_link(self, href: str, social_links: Dict[str, str]) -> None:
        """Categorize a link into the appropriate social platform."""
        href_lower = href.lower()
        if "instagram.com/" in href_lower:
            social_links["instagram"] = href
        elif "twitter.com/" in href_lower or "x.com/" in href_lower:
            social_links["twitter"] = href
        elif "youtube.com/" in href_lower or "youtu.be/" in href_lower:
            social_links["youtube"] = href
        elif "open.spotify.com/artist/" in href_lower:
            social_links["spotify"] = href
        elif "facebook.com/" in href_lower:
            social_links["facebook"] = href
        elif ".bandcamp.com" in href_lower:
            social_links["bandcamp"] = href
        elif "tiktok.com/@" in href_lower:
            social_links["tiktok"] = href
        elif "linktr.ee/" in href_lower or "linktree.com/" in href_lower:
            social_links["linktree"] = href
        elif href_lower.startswith("http") and "soundcloud.com" not in href_lower:
            if "website" not in social_links:
                social_links["website"] = href

    def _relative_time(self, iso_date: str) -> str:
        """Convert ISO date string to relative time."""
        from datetime import datetime, timezone

        try:
            dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            diff = now - dt
            days = diff.days
            if days < 1:
                hours = diff.seconds // 3600
                return "just now" if hours < 1 else f"{hours} hour{'s' if hours != 1 else ''} ago"
            if days < 7:
                return f"{days} day{'s' if days != 1 else ''} ago"
            if days < 30:
                weeks = days // 7
                return f"{weeks} week{'s' if weeks != 1 else ''} ago"
            if days < 365:
                months = days // 30
                return f"{months} month{'s' if months != 1 else ''} ago"
            years = days // 365
            return f"{years} year{'s' if years != 1 else ''} ago"
        except Exception:
            return iso_date
```

- [ ] **Step 2: Verify scraper file is saved and syntax is valid**

Run: `cd "/Users/benjamin/campaign manager/apps/scraper" && python -c "import ast; ast.parse(open('src/services/soundcloud_scraper.py').read()); print('Syntax OK')"`

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/services/soundcloud_scraper.py
git commit -m "feat: rewrite SoundCloud scraper to use public API instead of BeautifulSoup mocks"
```

---

## Task 2: Update Scraper Routes and Models

**Files:**
- Rewrite: `apps/scraper/src/api/routes/discovery.py`
- Rewrite: `apps/scraper/src/api/routes/soundcloud.py`
- Modify: `apps/scraper/src/main.py`
- Delete: `apps/scraper/src/services/artist_discovery.py`

- [ ] **Step 1: Rewrite discovery route with single /discover endpoint**

Replace `apps/scraper/src/api/routes/discovery.py`:

```python
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from services.soundcloud_scraper import SoundCloudScraper

router = APIRouter()


class DiscoverRequest(BaseModel):
    seed_url: str
    min_followers: int = 2000
    max_followers: int = 50000
    genres: Optional[List[str]] = None
    uploaded_within_days: Optional[int] = 365
    max_results: int = 100


@router.post("/discover")
async def discover_artists(request: DiscoverRequest):
    """Discover artists similar to a seed artist with filtering criteria.
    Returns lightweight metadata (no full scraping)."""

    if not request.seed_url:
        raise HTTPException(status_code=400, detail="No seed URL provided")

    try:
        async with SoundCloudScraper() as scraper:
            result = await scraper.discover_artists(
                seed_url=request.seed_url,
                min_followers=request.min_followers,
                max_followers=request.max_followers,
                genres=request.genres,
                uploaded_within_days=request.uploaded_within_days,
                max_results=request.max_results,
            )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")
```

- [ ] **Step 2: Simplify soundcloud routes**

Replace `apps/scraper/src/api/routes/soundcloud.py` with a clean version that:
- Keeps `/artist` endpoint for backwards compatibility
- Adds `/scrape` endpoint that the ScraperModal expects (accepts `{ url }`, returns flat artist data)
- Removes all the complex batch/queue/smart/contact/export endpoints (dead code)

```python
from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from services.soundcloud_scraper import SoundCloudScraper

router = APIRouter()


class ScrapeRequest(BaseModel):
    url: str


class BatchScrapeRequest(BaseModel):
    urls: List[str]


@router.post("/scrape")
async def scrape_single_artist(request: ScrapeRequest):
    """Scrape a single SoundCloud artist profile.
    Used by the ScraperModal in the dashboard."""
    try:
        async with SoundCloudScraper() as scraper:
            result = await scraper.scrape_artist(request.url)

        if not result.success:
            return {
                "name": result.artist_name,
                "email": None,
                "followers": None,
                "success": False,
                "error": result.error_message,
            }

        return {
            "name": result.artist_name,
            "email": result.email,
            "followers": result.followers,
            "location": result.location,
            "bio": result.bio,
            "genres": [],
            "image_url": result.profile_image_url,
            "track_count": result.track_count,
            "most_recent_song_title": result.most_recent_song_title,
            "most_recent_song_url": result.most_recent_song_url,
            "most_recent_upload_date": result.most_recent_upload_date,
            "social_links": result.social_links,
            "instagram": result.social_links.get("instagram"),
            "spotify_url": result.social_links.get("spotify"),
            "success": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")


@router.post("/batch-scrape")
async def batch_scrape_artists(request: BatchScrapeRequest):
    """Scrape multiple SoundCloud artist profiles."""
    if not request.urls:
        raise HTTPException(status_code=400, detail="No URLs provided")
    if len(request.urls) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 URLs per batch")

    try:
        async with SoundCloudScraper() as scraper:
            results = await scraper.scrape_multiple_artists(request.urls)

        return {
            "results": [
                {
                    "name": r.artist_name,
                    "soundcloud_url": r.soundcloud_url,
                    "email": r.email,
                    "followers": r.followers,
                    "location": r.location,
                    "bio": r.bio,
                    "image_url": r.profile_image_url,
                    "track_count": r.track_count,
                    "most_recent_song_title": r.most_recent_song_title,
                    "most_recent_song_url": r.most_recent_song_url,
                    "most_recent_upload_date": r.most_recent_upload_date,
                    "social_links": r.social_links or {},
                    "instagram": (r.social_links or {}).get("instagram"),
                    "spotify_url": (r.social_links or {}).get("spotify"),
                    "success": r.success,
                    "error": r.error_message,
                }
                for r in results
            ],
            "total": len(results),
            "successful": sum(1 for r in results if r.success),
            "failed": sum(1 for r in results if not r.success),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch scraping failed: {str(e)}")
```

- [ ] **Step 3: Update main.py to add /scrape/soundcloud compatibility route**

Add a route alias so the ScraperModal's `${SCRAPER_URL}/scrape/soundcloud` calls work. The scraper routes are at `/api/soundcloud/scrape` but the dashboard calls `/scrape/soundcloud`.

In `apps/scraper/src/main.py`, add after existing router includes:

```python
# Compatibility route for ScraperModal (calls /scrape/soundcloud)
from api.routes.soundcloud import scrape_single_artist
app.post("/scrape/soundcloud")(scrape_single_artist)
```

- [ ] **Step 4: Delete artist_discovery.py**

Remove `apps/scraper/src/services/artist_discovery.py` — it's entirely replaced by the new SoundCloudScraper.discover_artists method.

- [ ] **Step 5: Verify scraper starts**

Run: `cd "/Users/benjamin/campaign manager/apps/scraper" && python -c "from src.services.soundcloud_scraper import SoundCloudScraper; print('Import OK')"`

- [ ] **Step 6: Commit**

```bash
git add -A apps/scraper/src/
git commit -m "feat: update scraper routes for discovery and simplify soundcloud endpoints"
```

---

## Task 3: Database Migration for Blocked Terms

**Files:**
- Create: `supabase/migrations/00004_blocked_terms.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Blocked terms for filtering discovery/scraper results
-- Types: 'email_domain' (blocks emails with matching domain) and 'profile_name' (blocks artist names containing term)
CREATE TABLE IF NOT EXISTS blocked_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_domain', 'profile_name')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Prevent duplicate term+type combinations
CREATE UNIQUE INDEX IF NOT EXISTS blocked_terms_term_type_idx ON blocked_terms(lower(term), type);

-- RLS: all authenticated users can read and manage blocked terms
ALTER TABLE blocked_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read blocked terms"
  ON blocked_terms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert blocked terms"
  ON blocked_terms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blocked terms"
  ON blocked_terms FOR DELETE
  TO authenticated
  USING (true);
```

- [ ] **Step 2: Apply migration**

Run: `cd "/Users/benjamin/campaign manager" && npx supabase db push` or apply via Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00004_blocked_terms.sql
git commit -m "feat: add blocked_terms table for discovery/scraper filtering"
```

---

## Task 4: Blocked Terms Hook and Settings UI

**Files:**
- Create: `apps/dashboard/src/hooks/useBlockedTerms.ts`
- Modify: `apps/dashboard/src/pages/Settings.tsx`

- [ ] **Step 1: Create useBlockedTerms hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface BlockedTerm {
  id: string
  term: string
  type: 'email_domain' | 'profile_name'
  created_at: string
}

export function useBlockedTerms() {
  return useQuery({
    queryKey: ['blocked-terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_terms')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BlockedTerm[]
    },
  })
}

export function useAddBlockedTerm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ term, type }: { term: string; type: 'email_domain' | 'profile_name' }) => {
      const { data: user } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('blocked_terms')
        .insert({ term: term.toLowerCase().trim(), type, created_by: user.user?.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-terms'] }),
  })
}

export function useDeleteBlockedTerm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_terms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-terms'] }),
  })
}
```

- [ ] **Step 2: Add blocked terms section to Settings page**

Add a new card section to `apps/dashboard/src/pages/Settings.tsx` after the "Data Management" section. Add the import at the top and a new "Blocked Terms" card with:
- Two sub-sections: Email Domains and Profile Name Keywords
- Each term shown as a pill with an X delete button
- Add form with text input and type dropdown
- Uses the useBlockedTerms hooks

The section should be added before the closing `</div>` of the `max-w-2xl space-y-6` container.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/hooks/useBlockedTerms.ts apps/dashboard/src/pages/Settings.tsx
git commit -m "feat: add blocked terms management to Settings page"
```

---

## Task 5: LeadGeneratorModal Component

**Files:**
- Create: `apps/dashboard/src/components/pipeline/LeadGeneratorModal.tsx`

This is the main UI component — a 4-step modal for artist discovery.

- [ ] **Step 1: Create the LeadGeneratorModal**

Create `apps/dashboard/src/components/pipeline/LeadGeneratorModal.tsx`.

The component should implement:

**Props:** `{ onClose: () => void }`

**State:**
- `step`: 'config' | 'discovering' | 'results' | 'scraping' | 'review' | 'importing' | 'done'
- Config form state: seedUrl, minFollowers (2000), maxFollowers (50000), selectedGenres (string[]), uploadRecency (365), maxResults (100)
- Discovery results: discoveredLeads array, totalFound, filteredCount, filterStats, seedArtistName
- Selection state: selectedIndices Set
- Scrape results: scrapedArtists array, scrapeProgress
- Import state: importStage, importProgress, importResults

**Genre options constant:**
```typescript
const GENRES = [
  'Electronic', 'Hip-Hop', 'Pop', 'R&B', 'Rock', 'Indie', 'House', 'Techno',
  'Drum & Bass', 'Dubstep', 'Trap', 'Lo-Fi', 'Ambient', 'Soul', 'Funk',
  'Latin', 'UKG', 'Jungle', 'Grime', 'Afrobeats', 'Amapiano', 'Jersey Club',
  'Drill', 'Phonk',
]

const UPLOAD_RECENCY = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 3 months', value: 90 },
  { label: 'Last 6 months', value: 180 },
  { label: 'Last year', value: 365 },
  { label: 'Any time', value: 0 },
]
```

**Step 1 - Config:** Form with seed URL input, genre multi-select (clickable pills that toggle), follower min/max number inputs, upload recency dropdown, max results input, "Discover" button.

**Step 2 - Discovering:** Loading spinner with "Discovering artists similar to {seedUrl}..." text.

**Step 3 - Results:** Table of discovered leads with:
- Checkbox column
- Avatar + Name column (link to SC profile)
- Followers column (formatted with toLocaleString)
- Tracks column
- Genre column
- Location column (city, country)
- "In pipeline" badge for duplicates (disabled checkbox, yellow row)
- Stats bar at top: "{filteredCount} found from {totalFound} candidates"
- Filter stats: "{filter_stats.followers_low} too small, {filter_stats.followers_high} too big, {filter_stats.no_tracks} no tracks, {filter_stats.too_old} inactive"
- Toolbar: Select All / Deselect All / "{selectedCount} selected"
- "Scrape Selected ({selectedCount})" button

**Step 4 - Scraping:** Progress bar showing X/Y scraped, emails found count, ETA.

**Step 5 - Review:** Same as existing ScraperModal results step:
- Table with Name, Email (editable), Followers, Links
- Duplicate detection (yellow rows)
- Blocked terms filtering
- Select All With Emails / Deselect All / Download CSV buttons
- Import stage selector (Discovered/Contacted/Responded)
- "Import Selected" button

**Step 6 - Importing:** Progress bar.

**Step 7 - Done:** Summary card with imported/skipped/failed counts.

**Key implementation details:**
- `SCRAPER_URL` from `import.meta.env.VITE_SCRAPER_URL || 'http://localhost:9999'`
- Discovery call: `POST ${SCRAPER_URL}/api/discovery/discover`
- Scrape calls: `POST ${SCRAPER_URL}/api/soundcloud/scrape` per selected artist
- Duplicate check: query `supabase.from('artists').select('soundcloud_url')` before showing results
- Excluded check: query `supabase.from('excluded_artists').select('email')`
- Blocked terms: query `supabase.from('blocked_terms').select('term, type')` — filter client-side
- Import: insert into `artists` table then create pipeline entry via `useCreatePipelineEntry`

- [ ] **Step 2: Verify file compiles**

Run: `cd "/Users/benjamin/campaign manager" && npx tsc --noEmit apps/dashboard/src/components/pipeline/LeadGeneratorModal.tsx` or check in dev server.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/components/pipeline/LeadGeneratorModal.tsx
git commit -m "feat: add LeadGeneratorModal for SoundCloud artist discovery"
```

---

## Task 6: Wire LeadGeneratorModal into Pipeline Page

**Files:**
- Modify: `apps/dashboard/src/pages/Pipeline.tsx`

- [ ] **Step 1: Add import and state**

At the top of Pipeline.tsx, add:
```typescript
import { LeadGeneratorModal } from '@/components/pipeline/LeadGeneratorModal'
```

Add state:
```typescript
const [showLeadGen, setShowLeadGen] = useState(false)
```

- [ ] **Step 2: Add "Discover Artists" button to toolbar**

In the Pipeline page toolbar (where the "Import from Scraper" button lives), add a new button before it:

```tsx
<button
  onClick={() => setShowLeadGen(true)}
  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
>
  <Search className="h-4 w-4" />
  Discover Artists
</button>
```

- [ ] **Step 3: Render the modal**

Add at the bottom of the Pipeline component return, before the closing fragment:

```tsx
{showLeadGen && (
  <LeadGeneratorModal onClose={() => setShowLeadGen(false)} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/pages/Pipeline.tsx
git commit -m "feat: add Discover Artists button to Pipeline page"
```

---

## Task 7: Add Blocked Terms Filtering to ScraperModal

**Files:**
- Modify: `apps/dashboard/src/components/pipeline/ScraperModal.tsx`

The existing ScraperModal should also filter results against blocked terms (spec requirement).

- [ ] **Step 1: Add blocked terms check to ScraperModal**

In `ScraperModal.tsx`, after the exclude list check and before the scraping loop, fetch blocked terms:

```typescript
// Fetch blocked terms
const { data: blockedTerms } = await supabase
  .from('blocked_terms')
  .select('term, type')
const blockedDomains = (blockedTerms ?? [])
  .filter((t) => t.type === 'email_domain')
  .map((t) => t.term.toLowerCase())
const blockedNames = (blockedTerms ?? [])
  .filter((t) => t.type === 'profile_name')
  .map((t) => t.term.toLowerCase())
```

Then in the results processing (after scraping each artist), add a blocked check:

```typescript
const isBlocked =
  (data.email && blockedDomains.some((d) => data.email.toLowerCase().split('@')[1]?.includes(d))) ||
  blockedNames.some((n) => (data.name || '').toLowerCase().includes(n))
```

Mark blocked artists similar to excluded — set `isDuplicate: true` and `duplicateNote: 'Blocked'`.

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/src/components/pipeline/ScraperModal.tsx
git commit -m "feat: add blocked terms filtering to ScraperModal"
```

---

## Task 8: Test End-to-End Flow

- [ ] **Step 1: Start the scraper**

```bash
cd "/Users/benjamin/campaign manager/apps/scraper"
source venv/bin/activate
python -m uvicorn src.main:app --port 9999 --reload
```

Verify: `curl http://localhost:9999/health/` returns `{"status": "healthy"}`

- [ ] **Step 2: Test discovery endpoint directly**

```bash
curl -X POST http://localhost:9999/api/discovery/discover \
  -H "Content-Type: application/json" \
  -d '{"seed_url": "https://soundcloud.com/flaboratz", "min_followers": 1000, "max_followers": 100000, "max_results": 10}'
```

Expected: JSON response with `results` array containing artist objects.

- [ ] **Step 3: Test scrape endpoint directly**

```bash
curl -X POST http://localhost:9999/api/soundcloud/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://soundcloud.com/flaboratz"}'
```

Expected: JSON with artist name, email, followers, etc.

- [ ] **Step 4: Test ScraperModal compatibility**

```bash
curl -X POST http://localhost:9999/scrape/soundcloud \
  -H "Content-Type: application/json" \
  -d '{"url": "https://soundcloud.com/flaboratz"}'
```

Expected: Same response as step 3 (compatibility route).

- [ ] **Step 5: Start dashboard and test UI flow**

```bash
cd "/Users/benjamin/campaign manager/apps/dashboard"
pnpm dev
```

Open http://localhost:3333, navigate to Pipeline, click "Discover Artists", enter a seed URL, run discovery, review results, scrape selected, import.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete lead generator - SoundCloud discovery, scraper rewrite, blocked terms"
```
