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
