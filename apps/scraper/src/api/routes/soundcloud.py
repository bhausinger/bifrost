from fastapi import APIRouter, HTTPException
from typing import List
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
