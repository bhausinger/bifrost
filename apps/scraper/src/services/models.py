"""
Shared data models and constants for the SoundCloud scraper.
"""
from dataclasses import dataclass, field
from typing import Optional

from .email_utils import extract_email


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
    "bass": ["bass music", "dubstep", "experimental bass"],
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
    "ukg": ["uk garage", "garage", "2-step"],
    "uk garage": ["ukg", "garage", "2-step"],
    "speed garage": ["ukg", "uk garage", "garage"],
}


SC_API = "https://api-v2.soundcloud.com"
DEFAULT_CLIENT_ID = "WU4bVxk5Df0g5JC8ULzW77Ry7OM10Lyj"


@dataclass
class ScrapedArtist:
    name: str
    soundcloud_url: str
    email: Optional[str] = None
    email_source: Optional[str] = None
    followers: Optional[int] = None
    monthly_listeners: Optional[int] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    genres: list[str] = field(default_factory=list)
    image_url: Optional[str] = None
    spotify_url: Optional[str] = None
    instagram: Optional[str] = None
    track_count: Optional[int] = None
    latest_track_title: Optional[str] = None
    latest_track_url: Optional[str] = None
    latest_track_plays: Optional[int] = None
    social_links: dict[str, str] = field(default_factory=dict)
    sc_user_id: Optional[int] = None
    success: bool = False
    error: Optional[str] = None

    def to_api_response(self) -> dict:
        """Format for the dashboard ScraperModal."""
        return {
            "name": self.name,
            "email": self.email,
            "email_source": self.email_source,
            "followers": self.followers,
            "monthly_listeners": self.monthly_listeners,
            "genres": self.genres,
            "image_url": self.image_url,
            "spotify_url": self.spotify_url,
            "instagram": self.instagram,
            "location": self.location,
            "track_count": self.track_count,
            "soundcloud_url": self.soundcloud_url,
            "sc_user_id": self.sc_user_id,
            "latest_track_title": self.latest_track_title,
            "latest_track_url": self.latest_track_url,
            "latest_track_plays": self.latest_track_plays,
            "social_links": self.social_links,
            "success": self.success,
            "error": self.error,
        }


def normalize_url(url: str) -> str:
    """Clean and normalize SoundCloud URL."""
    url = url.strip()
    if url.lower().startswith("soundcloud.com/"):
        return f"https://{url}"
    if url.startswith("http"):
        return url
    return f"https://soundcloud.com/{url.strip('@/')}"


def name_from_url(url: str) -> str:
    """Extract a clean artist name from a SoundCloud URL."""
    norm = url.strip().rstrip("/")
    if "soundcloud.com/" in norm.lower():
        username = norm[norm.lower().index("soundcloud.com/") + 15:].split("/")[0]
    else:
        username = norm.split("/")[-1]
    return " ".join(w.capitalize() for w in username.replace("-", " ").replace("_", " ").split())


def build_artist(user: dict, sc_url: str, web_profiles: list[dict] = None) -> ScrapedArtist:
    """Build ScrapedArtist from SC API user object + web_profiles."""
    bio = user.get("description", "") or ""
    email = extract_email(bio)

    spotify_url = None
    instagram = None
    social_links: dict[str, str] = {}

    website = user.get("website", "") or ""
    if website:
        _categorize_link(website, social_links)
        wl = website.lower()
        if "open.spotify.com/artist/" in wl:
            spotify_url = website
        elif "instagram.com/" in wl:
            handle = website.rstrip("/").split("/")[-1]
            instagram = f"@{handle}" if not handle.startswith("@") else handle

    for wp in (web_profiles or []):
        url = wp.get("url", "")
        if not url:
            continue
        ul = url.lower()
        if not spotify_url and "open.spotify.com/artist/" in ul:
            spotify_url = url
            social_links["spotify"] = url
        elif not instagram and ("instagram.com/" in ul or wp.get("network") == "instagram"):
            handle = url.rstrip("/").split("/")[-1]
            instagram = f"@{handle}" if not handle.startswith("@") else handle
            social_links["instagram"] = url
        elif url.startswith("http"):
            _categorize_link(url, social_links)

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
        email_source="bio" if email else None,
        followers=user.get("followers_count"),
        monthly_listeners=None,
        location=location,
        bio=bio[:500] if bio else None,
        genres=genres,
        image_url=avatar or None,
        spotify_url=spotify_url,
        instagram=instagram,
        track_count=user.get("track_count"),
        social_links=social_links,
        sc_user_id=user.get("id"),
    )


def user_summary(u: dict) -> dict:
    """Lightweight user summary for discovery results."""
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
        "sc_user_id": u.get("id"),
    }


def _categorize_link(href: str, social_links: dict[str, str]) -> None:
    """Categorize a URL into the appropriate social platform."""
    hl = href.lower()
    if "instagram.com/" in hl:
        social_links.setdefault("instagram", href)
    elif "twitter.com/" in hl or "x.com/" in hl:
        social_links.setdefault("twitter", href)
    elif "youtube.com/" in hl or "youtu.be/" in hl:
        social_links.setdefault("youtube", href)
    elif "open.spotify.com/artist/" in hl:
        social_links.setdefault("spotify", href)
    elif "facebook.com/" in hl:
        social_links.setdefault("facebook", href)
    elif ".bandcamp.com" in hl:
        social_links.setdefault("bandcamp", href)
    elif "tiktok.com/@" in hl:
        social_links.setdefault("tiktok", href)
    elif "linktr.ee/" in hl or "linktree.com/" in hl:
        social_links.setdefault("linktree", href)
    elif "music.apple.com/" in hl:
        social_links.setdefault("apple_music", href)
    elif hl.startswith("http") and "soundcloud.com" not in hl:
        social_links.setdefault("website", href)


def relative_time(iso_date: str) -> str:
    """Convert ISO date string to relative time like '3 months ago'."""
    from datetime import datetime, timezone

    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        days = (now - dt).days
        if days < 1:
            hours = (now - dt).seconds // 3600
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
