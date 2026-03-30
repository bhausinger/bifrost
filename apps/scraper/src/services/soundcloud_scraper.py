"""
SoundCloud scraper — hits SoundCloud's public API directly.
No browser, no Playwright, no Selenium. Just httpx.
"""
import re
import asyncio
import datetime
import random
import logging
from typing import Optional
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)

# SoundCloud's public client_id (embedded in their frontend JS)
DEFAULT_CLIENT_ID = "WU4bVxk5Df0g5JC8ULzW77Ry7OM10Lyj"
SC_API = "https://api-v2.soundcloud.com"

# Genre variants for expanded search — maps each genre to related terms
GENRE_VARIANTS: dict[str, list[str]] = {
    "hip-hop": ["rap", "trap", "hip hop"],
    "rap": ["hip-hop", "trap", "hip hop"],
    "trap": ["hip-hop", "rap"],
    "electronic": ["edm", "electro"],
    "edm": ["electronic", "electro"],
    "lo-fi": ["lofi", "lo fi", "chillhop"],
    "lofi": ["lo-fi", "lo fi", "chillhop"],
    "house": ["deep house", "tech house"],
    "techno": ["tech house", "minimal"],
    "drum & bass": ["dnb", "drum and bass", "jungle"],
    "dnb": ["drum & bass", "drum and bass", "jungle"],
    "dubstep": ["bass music", "riddim"],
    "r&b": ["rnb", "r and b", "soul"],
    "rnb": ["r&b", "r and b", "soul"],
    "ambient": ["downtempo", "chillout"],
    "indie": ["indie pop", "indie rock", "alternative"],
    "pop": ["indie pop", "synth pop"],
    "grime": ["uk rap", "uk drill"],
    "drill": ["uk drill", "chicago drill"],
    "phonk": ["drift phonk", "memphis"],
    "afrobeats": ["afro house", "amapiano"],
    "amapiano": ["afrobeats", "afro house"],
    "jersey club": ["club", "baltimore club"],
    "jungle": ["drum & bass", "dnb", "ragga jungle"],
}


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
        uploaded_within_days: Optional[int] = None,
    ) -> dict:
        """Find artists similar to a seed profile."""
        clean = _normalize_url(seed_url)
        seed = await self._resolve(clean)
        if not seed:
            return {"results": [], "error": "Could not resolve seed"}

        seed_id = seed["id"]
        seed_name = seed.get("username", "Unknown")
        seed_genre = seed.get("genre", "")

        # Build expanded search queries using genre variants
        queries = [seed_name]
        base_genres = genres or ([seed_genre] if seed_genre else [])
        for g in base_genres:
            gl = g.lower().strip()
            if gl and gl not in [q.lower() for q in queries]:
                queries.append(g)
            # Add genre variants
            for variant in GENRE_VARIANTS.get(gl, []):
                if variant.lower() not in [q.lower() for q in queries]:
                    queries.append(variant)
        # Cap at 8 unique queries
        queries = queries[:8]

        # Build genre tags for track searches (up to 4)
        genre_tags = []
        for g in base_genres:
            gl = g.lower().strip()
            if gl and gl not in genre_tags:
                genre_tags.append(gl)
            for variant in GENRE_VARIANTS.get(gl, []):
                if variant.lower() not in genre_tags:
                    genre_tags.append(variant.lower())
        genre_tags = genre_tags[:4]

        # Phase 1: Fan out — related + paginated followings/followers + multi-page search + tag searches
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
                logger.debug(f"Discovery task error: {r}")
                continue
            for u in (r or []):
                uid = u.get("id")
                if uid and uid not in seen:
                    seen.add(uid)
                    candidates.append(u)

        # Phase 5: 2nd-degree connections — top 3 related artists' related + followings
        if candidates:
            # Pick top 3 by followers from initial candidates
            top3 = sorted(candidates, key=lambda u: u.get("followers_count", 0) or 0, reverse=True)[:3]
            second_degree_tasks = []
            for u in top3:
                uid = u.get("id")
                if uid:
                    second_degree_tasks.append(self._related(uid))
                    second_degree_tasks.append(self._followings(uid))

            if second_degree_tasks:
                raw2 = await asyncio.gather(*second_degree_tasks, return_exceptions=True)
                for r in raw2:
                    if isinstance(r, Exception):
                        continue
                    for u in (r or []):
                        uid = u.get("id")
                        if uid and uid not in seen:
                            seen.add(uid)
                            candidates.append(u)

        total_raw = len(candidates)

        # Filter with stats tracking
        cutoff_date = None
        if uploaded_within_days:
            cutoff_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=uploaded_within_days)

        below_min = 0
        above_max = 0
        no_tracks = 0
        too_old = 0
        passed = 0

        filtered = []
        for u in candidates:
            fc = u.get("followers_count", 0) or 0
            tc = u.get("track_count", 0) or 0

            if fc < min_followers:
                below_min += 1
                continue
            if fc > max_followers:
                above_max += 1
                continue
            if tc < 1:
                no_tracks += 1
                continue
            if cutoff_date:
                last_mod = u.get("last_modified")
                if last_mod:
                    try:
                        mod_dt = datetime.datetime.fromisoformat(last_mod.replace("Z", "+00:00"))
                        if mod_dt < cutoff_date:
                            too_old += 1
                            continue
                    except (ValueError, TypeError):
                        pass
            passed += 1
            filtered.append(u)

        filtered.sort(key=lambda u: u.get("followers_count", 0) or 0, reverse=True)
        filtered = filtered[:max_results]

        return {
            "results": [_user_summary(u) for u in filtered],
            "total_found": total_raw,
            "filtered_count": len(filtered),
            "seed_artist": seed_name,
            "filter_stats": {
                "total_raw": total_raw,
                "below_min": below_min,
                "above_max": above_max,
                "no_tracks": no_tracks,
                "too_old": too_old,
                "passed": passed,
            },
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
        """Follow SC's next_href cursor pagination up to max_pages."""
        all_items: list[dict] = []
        params = {**params, "client_id": self.client_id, "limit": limit}

        for page in range(max_pages):
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
                # next_href is a full URL with query params — parse and use
                url = next_href.split("?")[0]
                parsed = urlparse(next_href)
                params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
                params["client_id"] = self.client_id
            except Exception as e:
                logger.debug(f"Pagination error on page {page}: {e}")
                break

        return all_items

    async def _followings_paginated(self, uid: int) -> list[dict]:
        """Fetch up to 600 followings (3 pages x 200)."""
        try:
            return await self._paginated_fetch(
                f"{SC_API}/users/{uid}/followings", {}, max_pages=3, limit=200
            )
        except Exception:
            return []

    async def _followers_paginated(self, uid: int) -> list[dict]:
        """Fetch up to 600 followers (3 pages x 200)."""
        try:
            return await self._paginated_fetch(
                f"{SC_API}/users/{uid}/followers", {}, max_pages=3, limit=200
            )
        except Exception:
            return []

    async def _search_paginated(self, query: str) -> list[dict]:
        """Search users with 2-page pagination (up to 400 results)."""
        try:
            return await self._paginated_fetch(
                f"{SC_API}/search/users", {"q": query}, max_pages=2, limit=200
            )
        except Exception:
            return []

    async def _search_tracks_by_tag(self, tag: str, limit: int = 200) -> list[dict]:
        """Search tracks by tag/genre, extract unique artists from results."""
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
            # Extract unique user objects from tracks
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
        """
        Multi-strategy email finder:
        1. Linktree / link-in-bio pages (highest hit rate)
        2. Personal websites + /contact /about /booking subpages
        3. Instagram bio
        """
        SKIP_DOMAINS = {
            "twitter.com", "x.com", "facebook.com", "youtube.com",
            "spotify.com", "soundcloud.com", "tiktok.com", "youtu.be",
        }
        LINKTREE_DOMAINS = {
            "linktr.ee", "beacons.ai", "bio.link", "linkfire.com",
            "fanlink.to", "hoo.be", "direct.me", "msha.ke", "lnk.to",
            "solo.to", "campsite.bio", "withkoji.com", "snipfeed.co",
        }

        # --- Strategy 0: Check web_profiles for direct email entries ---
        for wp in web_profiles:
            url = wp.get("url", "")
            # SC profiles can have mailto: links in web_profiles
            if url and url.lower().startswith("mailto:"):
                email = _validate_email(url[7:].split("?")[0])
                if email:
                    logger.info(f"Email from SC web_profiles mailto: {email}")
                    return email
            # Some profiles use network="personal" with an email as the URL
            if url and "@" in url and not url.startswith("http"):
                email = _validate_email(url)
                if email:
                    logger.info(f"Email from SC web_profiles entry: {email}")
                    return email

        websites: list[str] = []      # Personal sites to deep-crawl
        linktrees: list[str] = []     # Link-in-bio pages
        ig_url: Optional[str] = None  # Instagram profile

        # Collect URLs from SC profile + web_profiles
        all_urls = []
        website = user.get("website", "") or ""
        if website:
            all_urls.append(website)
        for wp in web_profiles:
            url = wp.get("url", "")
            if url and url not in all_urls and url.startswith("http"):
                all_urls.append(url)
            # IG from web_profiles
            if wp.get("network") == "instagram":
                ig_url = url or f"https://www.instagram.com/{wp.get('username', '')}"

        # Also check bio for links (some artists put linktree in their bio)
        bio = user.get("description", "") or ""
        bio_links = re.findall(r'https?://[^\s<>"\']+', bio)
        for link in bio_links:
            if link not in all_urls:
                all_urls.append(link)

        for url in all_urls:
            ul = url.lower()
            domain = ul.split("//")[-1].split("/")[0].lstrip("www.")
            if domain in SKIP_DOMAINS:
                if "instagram.com" in ul and not ig_url:
                    ig_url = url
                continue
            if domain in LINKTREE_DOMAINS:
                linktrees.append(url)
            else:
                websites.append(url)

        # --- Strategy 1: Linktree / link-in-bio pages ---
        for url in linktrees[:2]:
            email = await self._fetch_email(url)
            if email:
                logger.info(f"Email from linktree {url}: {email}")
                return email

        # --- Strategy 2: Personal websites + subpages ---
        for url in websites[:2]:
            # Try homepage first
            email = await self._fetch_email(url)
            if email:
                logger.info(f"Email from website {url}: {email}")
                return email

            # Try common contact/booking subpages
            base = url.rstrip("/")
            for path in ["/contact", "/about", "/booking", "/bookings", "/press", "/info"]:
                email = await self._fetch_email(base + path)
                if email:
                    logger.info(f"Email from {base + path}: {email}")
                    return email

        # --- Strategy 3: Instagram bio ---
        if ig_url:
            email = await self._scrape_ig_email(ig_url)
            if email:
                logger.info(f"Email from IG {ig_url}: {email}")
                return email

        return None

    async def _fetch_email(self, url: str) -> Optional[str]:
        """Fetch a URL and extract email. Returns first valid email or None."""
        try:
            resp = await self._client.get(url, timeout=httpx.Timeout(8.0), follow_redirects=True)
            if resp.status_code != 200:
                return None
            ct = resp.headers.get("content-type", "")
            if "text" not in ct and "html" not in ct:
                return None
            text = resp.text

            # Check mailto: links first (most reliable)
            mailtos = re.findall(r'mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7})', text)
            for m in mailtos:
                email = _validate_email(m)
                if email:
                    return email

            # Then general email extraction
            return _extract_email(text)
        except Exception:
            return None

    async def _scrape_ig_email(self, ig_url: str) -> Optional[str]:
        """Try to extract email from Instagram profile page."""
        try:
            resp = await self._client.get(
                ig_url,
                timeout=httpx.Timeout(8.0),
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml",
                },
            )
            if resp.status_code != 200:
                return None

            # IG embeds profile data in JSON — look for email in meta tags and JSON
            text = resp.text

            # Check og:description meta (often contains bio text)
            og_match = re.search(r'<meta[^>]*property="og:description"[^>]*content="([^"]*)"', text)
            if og_match:
                email = _extract_email(og_match.group(1))
                if email:
                    return email

            # Check for email in any JSON-LD or embedded data
            email_fields = re.findall(r'"email"\s*:\s*"([^"]+@[^"]+)"', text)
            for ef in email_fields:
                email = _validate_email(ef)
                if email:
                    return email

            # General extraction from page source
            return _extract_email(text)
        except Exception:
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
    # Use stricter regex: TLD must be followed by non-alpha or end of string
    found = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}(?=[^A-Za-z]|$)", text)
    for email in found:
        local, domain = email.split("@", 1)
        # Skip if local part is all hex (hashes like 7c33659f530ef43fb4532fc6e83354)
        if re.fullmatch(r"[0-9a-f]+", local.lower()):
            continue
        # Skip if local part is all digits
        if local.replace(".", "").replace("-", "").replace("_", "").isdigit():
            continue
        # Skip if local part has no letters at all
        if not re.search(r"[a-zA-Z]", local):
            continue
        # Skip common false positives from JS/CSS/assets
        if domain.endswith((".png", ".jpg", ".js", ".css", ".svg", ".woff", ".woff2", ".ttf", ".eot")):
            continue
        # Skip unreasonably long local parts (real emails rarely exceed 30 chars)
        if len(local) > 40:
            continue
        # Skip if domain doesn't have at least one dot with letters on both sides
        if not re.match(r"[a-zA-Z0-9.-]+\.[a-zA-Z]{2,7}$", domain):
            continue
        return email
    return None


def _validate_email(email: str) -> Optional[str]:
    """Validate a single email string. Returns it if valid, None if junk."""
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    if re.fullmatch(r"[0-9a-f]+", local.lower()):
        return None
    if not re.search(r"[a-zA-Z]", local):
        return None
    if len(local) > 40:
        return None
    if not re.match(r"[a-zA-Z0-9.-]+\.[a-zA-Z]{2,7}$", domain):
        return None
    if domain.endswith((".png", ".jpg", ".js", ".css", ".svg", ".woff")):
        return None
    return email


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
        "last_modified": u.get("last_modified"),
    }
