"""
SoundCloud search — look up artists by name, return best-matching profiles.
Designed for batch lookups (e.g., 400 artist names → SC URLs).
"""
import asyncio
import logging
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Optional

from .models import user_summary

logger = logging.getLogger(__name__)

BATCH_CONCURRENCY = 5
MIN_CONFIDENCE_THRESHOLD = 0.4


@dataclass
class SearchMatch:
    query: str
    match: Optional[dict]
    confidence: float
    alternatives: list[dict]

    def to_api_response(self) -> dict:
        return {
            "query": self.query,
            "match": self.match,
            "confidence": round(self.confidence, 3),
            "alternatives": self.alternatives,
        }


def _name_similarity(query: str, candidate: str) -> float:
    """Score how well a candidate name matches the search query."""
    q = query.lower().strip()
    c = candidate.lower().strip()
    if q == c:
        return 1.0
    if q in c or c in q:
        return 0.85
    return SequenceMatcher(None, q, c).ratio()


def _pick_best_match(
    query: str, users: list[dict], max_alternatives: int = 3
) -> SearchMatch:
    """Score all candidates and pick the best match."""
    if not users:
        return SearchMatch(query=query, match=None, confidence=0.0, alternatives=[])

    scored = []
    for user in users:
        username = user.get("username", "")
        full_name = user.get("full_name", "")
        name_score = max(
            _name_similarity(query, username),
            _name_similarity(query, full_name) if full_name else 0.0,
        )
        # Boost artists with tracks (more likely to be the real profile)
        has_tracks = (user.get("track_count", 0) or 0) > 0
        track_boost = 0.05 if has_tracks else 0.0
        # Small boost for verified accounts
        verified_boost = 0.05 if user.get("verified") else 0.0
        total = min(name_score + track_boost + verified_boost, 1.0)
        scored.append((total, user))

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_user = scored[0]

    alternatives = []
    if best_score < 0.95:
        for score, user in scored[1 : max_alternatives + 1]:
            if score >= MIN_CONFIDENCE_THRESHOLD:
                summary = user_summary(user)
                summary["confidence"] = round(score, 3)
                alternatives.append(summary)

    best_summary = user_summary(best_user) if best_score >= MIN_CONFIDENCE_THRESHOLD else None

    return SearchMatch(
        query=query,
        match=best_summary,
        confidence=best_score if best_summary else 0.0,
        alternatives=alternatives,
    )


async def search_artist(scraper, name: str) -> SearchMatch:
    """Search SoundCloud for a single artist name."""
    try:
        users = await scraper._search(name, limit=10)
        return _pick_best_match(name, users)
    except Exception as e:
        logger.error(f"Search failed for '{name}': {e}")
        return SearchMatch(query=name, match=None, confidence=0.0, alternatives=[])


async def batch_search(
    scraper, names: list[str], concurrency: int = BATCH_CONCURRENCY
) -> list[dict]:
    """Search SoundCloud for a batch of artist names with concurrency control."""
    semaphore = asyncio.Semaphore(concurrency)
    results: list[dict] = []

    async def _search_one(name: str) -> dict:
        async with semaphore:
            result = await search_artist(scraper, name)
            return result.to_api_response()

    tasks = [_search_one(name.strip()) for name in names if name.strip()]
    results = await asyncio.gather(*tasks)

    matched = sum(1 for r in results if r["match"] is not None)
    logger.info(f"Batch search: {matched}/{len(results)} matched")

    return list(results)
