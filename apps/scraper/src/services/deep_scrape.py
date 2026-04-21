"""
Deep Scrape — batch email enrichment for discovery candidates.
Ported from TempoV3's Smart Lead Generator Phase 4.
"""
import asyncio
import logging
from typing import Optional, Any

from .models import SC_API, normalize_url
from .email_utils import extract_email, validate_email, is_junk_email
from .email_scraper import find_email_from_links

logger = logging.getLogger(__name__)


async def deep_scrape_artist(
    scraper: Any,  # SoundCloudScraper instance
    sc_url: str,
    sc_user_id: Optional[int] = None,
) -> dict:
    """
    Deep scrape a single artist: fetch web-profiles, run multi-strategy
    email extraction, collect social links, latest track info.
    """
    try:
        # Resolve user — shortcut if we have the ID
        if sc_user_id:
            params = {"client_id": scraper.client_id}
            resp = await scraper._get(f"{SC_API}/users/{sc_user_id}", params)
            if resp.status_code == 401:
                await scraper._refresh_id()
                params["client_id"] = scraper.client_id
                resp = await scraper._get(f"{SC_API}/users/{sc_user_id}", params)
            if resp.status_code != 200:
                return {"url": sc_url, "success": False, "error": f"User fetch failed: {resp.status_code}"}
            user = resp.json()
        else:
            clean = normalize_url(sc_url)
            user = await scraper._resolve(clean)
            if not user:
                return {"url": sc_url, "success": False, "error": "Could not resolve user"}

        user_id = user.get("id")
        username = user.get("username") or user.get("full_name") or "Unknown"

        # Fetch web-profiles + latest track concurrently
        wp_result, track_result = await asyncio.gather(
            scraper._web_profiles(user_id),
            scraper._get_latest_track(user_id),
            return_exceptions=True,
        )
        web_profiles = wp_result if isinstance(wp_result, list) else []
        recent_track = track_result if isinstance(track_result, dict) else None

        # Multi-strategy email extraction
        email, email_source = await find_email_from_links(scraper._client, user, web_profiles)

        # Fallback to bio regex
        if not email:
            bio = user.get("description", "") or ""
            if bio:
                email = extract_email(bio)
                if email:
                    email_source = "bio"

        # Validate and filter junk
        if email:
            email = validate_email(email)
            if email and is_junk_email(email):
                email = None
                email_source = ""

        # Extract social links from web-profiles
        social_links: dict[str, str] = {}
        spotify_url = None
        instagram_handle = None
        for wp in web_profiles:
            wp_url = wp.get("url", "")
            network = wp.get("network", "")
            if "spotify.com/artist/" in wp_url.lower():
                spotify_url = wp_url
                social_links["spotify"] = wp_url
            elif network == "instagram" or "instagram.com/" in wp_url.lower():
                handle = wp_url.rstrip("/").split("/")[-1]
                instagram_handle = f"@{handle}" if not handle.startswith("@") else handle
                social_links["instagram"] = wp_url
            elif wp_url and wp_url.startswith("http"):
                from .models import _categorize_link
                _categorize_link(wp_url, social_links)

        website = user.get("website", "")
        if website and website.startswith("http"):
            from .models import _categorize_link
            _categorize_link(website, social_links)

        avatar = user.get("avatar_url", "")
        if avatar:
            avatar = avatar.replace("-large.", "-t500x500.")

        # Recent track info
        track_title = None
        track_url = None
        track_plays = None
        if recent_track:
            track_title = recent_track.get("title")
            track_url = recent_track.get("permalink_url")
            track_plays = recent_track.get("playback_count")

        # Location
        city = user.get("city", "") or ""
        country = user.get("country_code", "") or ""
        location = f"{city}, {country}" if city and country else city or country or None

        return {
            "url": sc_url,
            "sc_user_id": user_id,
            "name": username,
            "email": email,
            "email_source": email_source if email else None,
            "followers": user.get("followers_count", 0),
            "track_count": user.get("track_count", 0),
            "bio": user.get("description", ""),
            "location": location,
            "avatar_url": avatar,
            "genre": user.get("genre", ""),
            "social_links": social_links,
            "spotify": spotify_url,
            "instagram": instagram_handle,
            "latest_track_title": track_title,
            "latest_track_url": track_url,
            "latest_track_plays": track_plays,
            "success": True,
        }
    except Exception as e:
        logger.error(f"deep_scrape_artist failed for {sc_url}: {e}")
        return {"url": sc_url, "success": False, "error": str(e)}


async def deep_scrape_batch(
    scraper: Any,
    candidates: list[dict],
    concurrency: int = 5,
) -> list[dict]:
    """
    Deep scrape a batch of candidates concurrently.
    Each candidate dict should have 'url' and optionally 'sc_user_id'.
    """
    sem = asyncio.Semaphore(concurrency)
    results: list[dict] = []

    async def _scrape_one(candidate: dict) -> dict:
        async with sem:
            return await deep_scrape_artist(
                scraper,
                sc_url=candidate.get("url", ""),
                sc_user_id=candidate.get("sc_user_id"),
            )

    tasks = [_scrape_one(c) for c in candidates]
    for coro in asyncio.as_completed(tasks):
        result = await coro
        results.append(result)
    return results
