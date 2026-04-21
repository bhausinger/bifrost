"""
Email extraction, validation, and junk filtering utilities.
Used by both single scrape and deep scrape flows.
"""
import re
from typing import Optional


# Junk emails scraped from websites that aren't real artist contacts
JUNK_EMAIL_PATTERNS = {
    "support@", "info@beatport", "help@", "noreply@", "no-reply@",
    "admin@", "contact@beatport", "support@beatport", "legal@",
    "privacy@", "abuse@", "postmaster@", "webmaster@",
    "guidelines@", "rules@", "feedback@", "press@beatport",
    "community@", "team@patreon", "support@patreon",
    "hello@bandcamp", "support@bandcamp", "support@spotify",
    "support@soundcloud", "copyright@", "dmca@", "takedown@",
}

JUNK_EMAIL_DOMAINS = {
    "beatport.com", "patreon.com", "bandcamp.com", "spotify.com",
    "soundcloud.com", "youtube.com", "facebook.com", "twitter.com",
    "instagram.com", "tiktok.com", "discord.com", "twitch.tv",
    "apple.com", "google.com", "amazon.com", "sentry.io",
    "example.com", "test.com", "localhost",
}

# Domains to skip when looking for email links (social platforms)
SKIP_DOMAINS = {
    "twitter.com", "x.com", "facebook.com", "youtube.com",
    "spotify.com", "soundcloud.com", "tiktok.com", "youtu.be",
}

# Link-in-bio platforms (high email hit rate)
LINKTREE_DOMAINS = {
    "linktr.ee", "beacons.ai", "bio.link", "linkfire.com",
    "fanlink.to", "hoo.be", "direct.me", "msha.ke", "lnk.to",
    "solo.to", "campsite.bio", "withkoji.com", "snipfeed.co",
}


def extract_email(text: str) -> Optional[str]:
    """Extract and validate the first email found in text."""
    if not text:
        return None
    found = re.findall(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}(?=[^A-Za-z]|$)",
        text,
    )
    for email in found:
        if validate_email(email):
            return email
    return None


def validate_email(email: str) -> Optional[str]:
    """Validate a single email string. Returns it if valid, None if junk."""
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    # All-hex local part (JS hashes like 7c33659f530ef43fb4532fc6e83354)
    if re.fullmatch(r"[0-9a-f]+", local.lower()):
        return None
    # All-digit local part
    if local.replace(".", "").replace("-", "").replace("_", "").isdigit():
        return None
    # No letters at all
    if not re.search(r"[a-zA-Z]", local):
        return None
    # Unreasonably long
    if len(local) > 40:
        return None
    # Domain format check
    if not re.match(r"[a-zA-Z0-9.-]+\.[a-zA-Z]{2,7}$", domain):
        return None
    # File extension false positives
    if domain.endswith((".png", ".jpg", ".js", ".css", ".svg", ".woff", ".woff2", ".ttf", ".eot")):
        return None
    return email


def is_junk_email(email: str) -> bool:
    """Check if an email is a known junk/platform support address."""
    lower = email.lower()
    domain = lower.split("@")[1] if "@" in lower else ""
    # Exact domain match
    if domain in JUNK_EMAIL_DOMAINS:
        return True
    # Subdomain match (e.g. jamiegos.bandcamp.com)
    for junk_domain in JUNK_EMAIL_DOMAINS:
        if domain.endswith("." + junk_domain):
            return True
    # Pattern match
    return any(pattern in lower for pattern in JUNK_EMAIL_PATTERNS)
