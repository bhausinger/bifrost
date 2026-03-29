"""
SoundCloud scraper — hits SoundCloud's public API directly.
No browser, no Playwright, no Selenium. Just httpx.
"""
import re
import asyncio
import random
import logging
from typing import Optional
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)

# SoundCloud's public client_id (embedded in their frontend JS)
DEFAULT_CLIENT_ID = "WU4bVxk5Df0g5JC8ULzW77Ry7OM10Lyj"
SC_API = "https://api-v2.soundcloud.com"


@dataclass
class ScrapedArtist:
    name: str
    soundcloud_url: str
    email: Optional[str] = None
    followers: Optional[int] = None
    monthly_listeners: Optional[int] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    genres: list[str] = field(default_factory=list)
    image_url: Optional[str] = None
    spotify_url: Optional[str] = None
    instagram: Optional[str] = None
    track_count: Optional[int] = None
    success: bool = False
    error: Optional[str] = None

    def to_api_response(self) -> dict:
        """Format for the dashboard ScraperModal."""
        return {
            "name": self.name,
            "email": self.email,
            "followers": self.followers,
            "monthly_listeners": self.monthly_listeners,
            "genres": self.genres,
            "image_url": self.image_url,
            "spotify_url": self.spotify_url,
            "instagram": self.instagram,
            "location": self.location,
            "track_count": self.track_count,
            "soundcloud_url": self.soundcloud_url,
            "success": self.success,
            "error": self.error,
        }


class SoundCloudScraper:
    def __init__(self):
        self.client_id = DEFAULT_CLIENT_ID
        self._client: Optional[httpx.AsyncClient] = None
        self._semaphore = asyncio.Semaphore(3)
        self._last_request = 0.0

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

    async def _get(self, url: str, params: dict = None) -> httpx.Response:
        """Throttled request with 429 retry."""
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
        """Scrape one SoundCloud profile. Returns structured artist data."""
        clean = _normalize_url(url)
        try:
            user = await self._resolve(clean)
            if not user:
                raise ValueError("Could not resolve profile")

            # Get linked social profiles from SC API
            web_profiles = await self._web_profiles(user["id"])

            result = _build_artist(user, clean, web_profiles)

            # If no email found in bio, try scraping their linked website
            if not result.email:
                result.email = await self._find_email_from_links(user, web_profiles)

            result.success = True
            logger.info(f"OK: {result.name} ({result.followers} followers, email={'yes' if result.email else 'no'})")
            return result
        except Exception as e:
            logger.error(f"FAIL: {url} — {e}")
            return ScrapedArtist(
                name=_name_from_url(url),
                soundcloud_url=clean,
                error=str(e),
            )

    # ── Discovery ─────────────────────────────────────────────────────

    async def discover(
        self,
        seed_url: str,
        min_followers: int = 0,
        max_followers: int = 999_999_999,
        genres: Optional[list[str]] = None,
        max_results: int = 50,
    ) -> dict:
        """Find artists similar to a seed profile."""
        clean = _normalize_url(seed_url)
        seed = await self._resolve(clean)
        if not seed:
            return {"results": [], "error": "Could not resolve seed"}

        seed_id = seed["id"]
        seed_name = seed.get("username", "Unknown")
        seed_genre = seed.get("genre", "")

        queries = [seed_name]
        for g in (genres or ([seed_genre] if seed_genre else [])):
            if g and g.lower() not in [q.lower() for q in queries]:
                queries.append(g)

        # Fan out: related + followings + followers + search queries
        tasks = [
            self._related(seed_id),
            self._followings(seed_id),
            self._followers(seed_id),
        ]
        for q in queries[:5]:
            tasks.append(self._search(q))

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

        # Filter
        filtered = [
            u for u in candidates
            if min_followers <= (u.get("followers_count", 0) or 0) <= max_followers
            and (u.get("track_count", 0) or 0) >= 1
        ]
        filtered.sort(key=lambda u: u.get("followers_count", 0) or 0, reverse=True)
        filtered = filtered[:max_results]

        return {
            "results": [_user_summary(u) for u in filtered],
            "total_found": len(candidates),
            "filtered_count": len(filtered),
            "seed_artist": seed_name,
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

    async def _web_profiles(self, user_id: int) -> list[dict]:
        """Get linked social profiles (Instagram, Spotify, website, etc.)."""
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

    async def _find_email_from_links(self, user: dict, web_profiles: list[dict]) -> Optional[str]:
        """Try to find an email by fetching the artist's linked websites."""
        urls_to_check = []

        # Website from SC profile
        website = user.get("website", "") or ""
        if website and not any(skip in website.lower() for skip in [
            "instagram.com", "twitter.com", "x.com", "facebook.com",
            "youtube.com", "spotify.com", "soundcloud.com", "tiktok.com",
        ]):
            urls_to_check.append(website)

        # Websites from web_profiles
        for wp in web_profiles:
            url = wp.get("url", "")
            if not url:
                continue
            ul = url.lower()
            # Linktree, personal sites, etc. — skip major social platforms
            if any(skip in ul for skip in [
                "instagram.com", "twitter.com", "x.com", "facebook.com",
                "youtube.com", "spotify.com", "soundcloud.com", "tiktok.com",
            ]):
                continue
            if url not in urls_to_check:
                urls_to_check.append(url)

        # Fetch each URL and look for emails
        for url in urls_to_check[:3]:  # Max 3 to avoid slowing things down
            try:
                resp = await self._client.get(url, timeout=httpx.Timeout(10.0), follow_redirects=True)
                if resp.status_code == 200 and "text" in resp.headers.get("content-type", ""):
                    email = _extract_email(resp.text)
                    if email:
                        logger.info(f"Found email on {url}: {email}")
                        return email
            except Exception:
                continue
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


# ── Pure functions (no self needed) ───────────────────────────────────


def _normalize_url(url: str) -> str:
    url = url.strip()
    if url.lower().startswith("soundcloud.com/"):
        return f"https://{url}"
    if url.startswith("http"):
        return url
    return f"https://soundcloud.com/{url.strip('@/')}"


def _name_from_url(url: str) -> str:
    norm = url.strip().rstrip("/")
    if "soundcloud.com/" in norm.lower():
        username = norm[norm.lower().index("soundcloud.com/") + 15:].split("/")[0]
    else:
        username = norm.split("/")[-1]
    return " ".join(w.capitalize() for w in username.replace("-", " ").replace("_", " ").split())


def _extract_email(text: str) -> Optional[str]:
    if not text:
        return None
    found = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text)
    return found[0] if found else None


def _build_artist(user: dict, sc_url: str, web_profiles: list[dict] = None) -> ScrapedArtist:
    bio = user.get("description", "") or ""
    email = _extract_email(bio)

    # Parse social links from website field + web_profiles
    spotify_url = None
    instagram = None

    # Check website field
    website = user.get("website", "") or ""
    if website:
        wl = website.lower()
        if "open.spotify.com/artist/" in wl:
            spotify_url = website
        elif "instagram.com/" in wl:
            handle = website.rstrip("/").split("/")[-1]
            instagram = f"@{handle}" if not handle.startswith("@") else handle

    # Check web_profiles for more links
    for wp in (web_profiles or []):
        url = wp.get("url", "")
        if not url:
            continue
        ul = url.lower()
        if not spotify_url and "open.spotify.com/artist/" in ul:
            spotify_url = url
        elif not instagram and "instagram.com/" in ul:
            handle = url.rstrip("/").split("/")[-1]
            instagram = f"@{handle}" if not handle.startswith("@") else handle

    genre = user.get("genre", "") or ""
    genres = [g.strip() for g in genre.split(",") if g.strip()] if genre else []

    city = user.get("city", "") or ""
    country = user.get("country_code", "") or ""
    location = f"{city}, {country}" if city and country else city or country or None

    avatar = user.get("avatar_url", "") or ""
    if avatar:
        avatar = avatar.replace("-large.", "-t500x500.")

    return ScrapedArtist(
        name=user.get("username") or user.get("full_name") or "Unknown",
        soundcloud_url=sc_url,
        email=email,
        followers=user.get("followers_count"),
        monthly_listeners=None,
        location=location,
        bio=bio[:500] if bio else None,
        genres=genres,
        image_url=avatar or None,
        spotify_url=spotify_url,
        instagram=instagram,
        track_count=user.get("track_count"),
    )


def _user_summary(u: dict) -> dict:
    avatar = u.get("avatar_url", "")
    if avatar:
        avatar = avatar.replace("-large.", "-t200x200.")
    permalink = u.get("permalink", "")
    return {
        "name": u.get("username") or "Unknown",
        "url": f"https://soundcloud.com/{permalink}" if permalink else "",
        "followers": u.get("followers_count", 0),
        "track_count": u.get("track_count", 0),
        "genre": u.get("genre", ""),
        "avatar_url": avatar,
        "city": u.get("city", ""),
        "country": u.get("country_code", ""),
    }
