"""
Async email extraction from artist profiles — linktree, websites, Instagram.
Requires an httpx.AsyncClient to make HTTP requests.
"""
import re
from typing import Optional

import httpx

from .email_utils import (
    extract_email, validate_email, is_junk_email,
    SKIP_DOMAINS, LINKTREE_DOMAINS,
)


async def find_email_from_links(
    client: httpx.AsyncClient,
    user: dict,
    web_profiles: list[dict],
) -> tuple[Optional[str], str]:
    """
    Multi-strategy email finder. Returns (email, source).
    Source is one of: 'sc_profile', 'linktree', 'website', 'instagram', or ''.
    """
    # Strategy 0: Direct email in web_profiles
    for wp in web_profiles:
        url = wp.get("url", "")
        if url and url.lower().startswith("mailto:"):
            email = validate_email(url[7:].split("?")[0])
            if email and not is_junk_email(email):
                return email, "sc_profile"
        if url and "@" in url and not url.startswith("http"):
            email = validate_email(url)
            if email and not is_junk_email(email):
                return email, "sc_profile"

    websites: list[str] = []
    linktrees: list[str] = []
    ig_url: Optional[str] = None

    all_urls: list[str] = []
    website = user.get("website", "") or ""
    if website:
        all_urls.append(website)
    for wp in web_profiles:
        url = wp.get("url", "")
        if url and url not in all_urls and url.startswith("http"):
            all_urls.append(url)
        if wp.get("network") == "instagram":
            ig_url = url or f"https://www.instagram.com/{wp.get('username', '')}"

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

    # Strategy 1: Linktree / link-in-bio
    for url in linktrees[:2]:
        email = await _fetch_email(client, url)
        if email and not is_junk_email(email):
            return email, "linktree"

    # Strategy 2: Personal websites + subpages
    for url in websites[:2]:
        email = await _fetch_email(client, url)
        if email and not is_junk_email(email):
            return email, "website"
        base = url.rstrip("/")
        for path in ["/contact", "/about", "/booking", "/bookings", "/press", "/info"]:
            email = await _fetch_email(client, base + path)
            if email and not is_junk_email(email):
                return email, "website"

    # Strategy 3: Instagram bio
    if ig_url:
        email = await _scrape_ig_email(client, ig_url)
        if email and not is_junk_email(email):
            return email, "instagram"

    return None, ""


async def _fetch_email(client: httpx.AsyncClient, url: str) -> Optional[str]:
    """Fetch a URL and extract the first valid email."""
    try:
        resp = await client.get(url, timeout=httpx.Timeout(8.0), follow_redirects=True)
        if resp.status_code != 200:
            return None
        ct = resp.headers.get("content-type", "")
        if "text" not in ct and "html" not in ct:
            return None
        text = resp.text
        # mailto: links first (most reliable)
        mailtos = re.findall(r'mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7})', text)
        for m in mailtos:
            email = validate_email(m)
            if email:
                return email
        return extract_email(text)
    except Exception:
        return None


async def _scrape_ig_email(client: httpx.AsyncClient, ig_url: str) -> Optional[str]:
    """Try to extract email from Instagram profile page."""
    try:
        resp = await client.get(
            ig_url, timeout=httpx.Timeout(8.0), follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
            },
        )
        if resp.status_code != 200:
            return None
        text = resp.text
        og_match = re.search(r'<meta[^>]*property="og:description"[^>]*content="([^"]*)"', text)
        if og_match:
            email = extract_email(og_match.group(1))
            if email:
                return email
        email_fields = re.findall(r'"email"\s*:\s*"([^"]+@[^"]+)"', text)
        for ef in email_fields:
            email = validate_email(ef)
            if email:
                return email
        return extract_email(text)
    except Exception:
        return None
