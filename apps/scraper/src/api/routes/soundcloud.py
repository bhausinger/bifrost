from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Optional
from pydantic import BaseModel, HttpUrl
import asyncio

from ...services.soundcloud_scraper import SoundCloudScraper
from ...models.schemas import ArtistProfile, TrackInfo, ScrapingTask

router = APIRouter()


class ScrapeArtistRequest(BaseModel):
    username: str
    include_tracks: bool = True
    max_tracks: int = 50


class ScrapeTrackRequest(BaseModel):
    track_url: HttpUrl


class SearchRequest(BaseModel):
    query: str
    limit: int = 20
    search_type: str = "artists"  # artists, tracks, playlists


@router.post("/artist", response_model=ArtistProfile)
async def scrape_artist(request: ScrapeArtistRequest):
    """Scrape a SoundCloud artist profile and their tracks."""
    try:
        scraper = SoundCloudScraper()
        result = await scraper.scrape_artist(
            username=request.username,
            include_tracks=request.include_tracks,
            max_tracks=request.max_tracks
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")


@router.post("/track", response_model=TrackInfo)
async def scrape_track(request: ScrapeTrackRequest):
    """Scrape a specific SoundCloud track."""
    try:
        scraper = SoundCloudScraper()
        result = await scraper.scrape_track(str(request.track_url))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Track scraping failed: {str(e)}")


@router.post("/search")
async def search_soundcloud(request: SearchRequest):
    """Search SoundCloud for artists, tracks, or playlists."""
    try:
        scraper = SoundCloudScraper()
        result = await scraper.search(
            query=request.query,
            limit=request.limit,
            search_type=request.search_type
        )
        return {"results": result, "query": request.query, "count": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/batch-scrape")
async def batch_scrape_artists(
    usernames: List[str],
    background_tasks: BackgroundTasks,
    include_tracks: bool = True,
    max_tracks: int = 20
):
    """Start a batch scraping task for multiple artists."""
    if len(usernames) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 artists per batch")
    
    task_id = f"batch_{len(usernames)}_{hash(tuple(usernames))}"
    
    # Add to background tasks
    background_tasks.add_task(
        _batch_scrape_task,
        task_id,
        usernames,
        include_tracks,
        max_tracks
    )
    
    return {
        "task_id": task_id,
        "status": "started",
        "usernames": usernames,
        "estimated_time": f"{len(usernames) * 2} seconds"
    }


@router.get("/task/{task_id}")
async def get_scraping_task_status(task_id: str):
    """Get the status of a scraping task."""
    # TODO: Implement task status tracking with Redis
    return {
        "task_id": task_id,
        "status": "not_implemented",
        "message": "Task status tracking not implemented yet"
    }


async def _batch_scrape_task(
    task_id: str,
    usernames: List[str],
    include_tracks: bool,
    max_tracks: int
):
    """Background task for batch scraping."""
    # TODO: Implement batch scraping with proper error handling and status updates
    pass