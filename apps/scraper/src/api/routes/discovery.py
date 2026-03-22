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
