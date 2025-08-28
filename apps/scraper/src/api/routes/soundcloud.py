from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Optional
from pydantic import BaseModel, HttpUrl
from datetime import timedelta
import asyncio

from services.soundcloud_scraper import SoundCloudScraper
from services.hybrid_scraper import HybridContactScraper, BatchContactScraper
from services.queue_manager import ScrapingQueueManager, QueuePriority
from services.contact_enricher import ContactEnricher, ContactExporter
from services.smart_scraper import SmartAutoScraper, scrape_artist_auto, scrape_artists_auto
from models.schemas import ArtistProfile, TrackInfo, ScrapingTask, ContactInfo, ScrapingResult

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


class ContactScrapingRequest(BaseModel):
    artist_names: List[str]
    use_playwright: Optional[bool] = None  # None=auto-decide, True=force, False=disable
    max_platforms: int = 6
    priority: str = "normal"  # low, normal, high, urgent
    export_format: str = "json"  # json, csv, hubspot, salesforce


class BatchScrapingRequest(BaseModel):
    artist_names: List[str]
    use_playwright: Optional[bool] = None  # None=auto-decide, True=force, False=disable
    priority: str = "normal"
    user_id: Optional[str] = None


class SmartScrapingRequest(BaseModel):
    artist_names: List[str]
    mode: str = "auto"  # auto, quick, deep
    max_concurrent: int = 3


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


@router.post("/contacts/scrape")
async def scrape_artist_contacts(request: ContactScrapingRequest):
    """Scrape comprehensive contact information for multiple artists."""
    try:
        hybrid_scraper = HybridContactScraper()
        contact_enricher = ContactEnricher()
        contact_exporter = ContactExporter()
        
        # Process artists
        all_results = []
        for artist_name in request.artist_names:
            result = await hybrid_scraper.scrape_artist_contacts(
                artist_name,
                use_playwright=request.use_playwright,
                max_platforms=request.max_platforms
            )
            
            # Enrich contact information
            if result.success:
                enriched_contact_info = await contact_enricher.enrich_contact_info(result.contact_info)
                result.contact_info = enriched_contact_info
            
            all_results.append(result)
        
        # Export in requested format
        if request.export_format == "csv":
            export_data = await contact_exporter.export_to_csv(all_results)
            return {"results": all_results, "export_data": export_data, "format": "csv"}
        elif request.export_format in ["hubspot", "salesforce"]:
            export_data = await contact_exporter.export_for_crm(all_results, request.export_format)
            return {"results": all_results, "export_data": export_data, "format": request.export_format}
        else:
            export_data = await contact_exporter.export_to_json(all_results)
            return {"results": all_results, "export_data": export_data, "format": "json"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contact scraping failed: {str(e)}")


@router.post("/contacts/batch")
async def batch_scrape_contacts(request: BatchScrapingRequest):
    """Start a batch contact scraping job using the queue system."""
    try:
        # Map priority string to enum
        priority_map = {
            "low": QueuePriority.LOW,
            "normal": QueuePriority.NORMAL,
            "high": QueuePriority.HIGH,
            "urgent": QueuePriority.URGENT
        }
        
        priority = priority_map.get(request.priority.lower(), QueuePriority.NORMAL)
        
        # Add task to queue
        async with ScrapingQueueManager() as queue_manager:
            task_id = await queue_manager.add_scraping_task(
                artist_names=request.artist_names,
                priority=priority,
                use_playwright=request.use_playwright,
                user_id=request.user_id
            )
            
            return {
                "task_id": task_id,
                "status": "queued",
                "artist_count": len(request.artist_names),
                "estimated_duration": len(request.artist_names) * 3.5,
                "message": f"Batch scraping job queued for {len(request.artist_names)} artists"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue batch job: {str(e)}")


@router.get("/contacts/batch/{task_id}")
async def get_batch_status(task_id: str):
    """Get status of a batch scraping task."""
    try:
        async with ScrapingQueueManager() as queue_manager:
            task = await queue_manager.get_task_status(task_id)
            
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
                
            return {
                "task_id": task_id,
                "status": task.status.value,
                "progress": task.progress,
                "artist_count": len(task.artist_names),
                "completed_count": len([r for r in task.results if r.get('success', False)]) if task.results else 0,
                "created_at": task.created_at.isoformat(),
                "estimated_completion": task.created_at + timedelta(seconds=task.estimated_duration) if task.status.value == "in_progress" else None,
                "error_message": task.error_message,
                "results": task.results if task.status.value == "completed" else None
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")


@router.get("/queue/status")
async def get_queue_status():
    """Get overall queue status and statistics."""
    try:
        async with ScrapingQueueManager() as queue_manager:
            status = await queue_manager.get_queue_status()
            return status
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get queue status: {str(e)}")


@router.post("/contacts/export")
async def export_contacts(task_ids: List[str], export_format: str = "json"):
    """Export contact data from completed tasks."""
    try:
        all_results = []
        
        async with ScrapingQueueManager() as queue_manager:
            for task_id in task_ids:
                task = await queue_manager.get_task_status(task_id)
                if task and task.results:
                    # Convert dict results back to ScrapingResult objects
                    for result_dict in task.results:
                        if isinstance(result_dict, dict):
                            # This is a simplified conversion - you might need to enhance this
                            scraping_result = ScrapingResult(
                                artist_name=result_dict.get('artist_name', ''),
                                contact_info=ContactInfo(**result_dict.get('contact_info', {})),
                                scraping_duration=result_dict.get('scraping_duration', 0.0),
                                platforms_scraped=result_dict.get('platforms_scraped', []),
                                success=result_dict.get('success', False),
                                error_message=result_dict.get('error_message')
                            )
                            all_results.append(scraping_result)
        
        if not all_results:
            raise HTTPException(status_code=404, detail="No completed results found for the specified task IDs")
        
        # Export data
        contact_exporter = ContactExporter()
        
        if export_format == "csv":
            export_data = await contact_exporter.export_to_csv(all_results)
        elif export_format in ["hubspot", "salesforce"]:
            export_data = await contact_exporter.export_for_crm(all_results, export_format)
        else:
            export_data = await contact_exporter.export_to_json(all_results)
        
        return {
            "export_data": export_data,
            "format": export_format,
            "total_results": len(all_results),
            "successful_results": sum(1 for r in all_results if r.success)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/smart/scrape")
async def smart_scrape(request: SmartScrapingRequest):
    """
    Smart auto-scraping with automatic Playwright optimization.
    This is the simplest and most user-friendly endpoint.
    """
    try:
        async with SmartAutoScraper() as scraper:
            
            if request.mode == "quick":
                # Quick email-only scraping for all artists
                results = []
                for artist_name in request.artist_names:
                    result = await scraper.quick_email_check(artist_name)
                    results.append(result)
                    
                return {
                    "mode": "quick",
                    "results": results,
                    "summary": {
                        "total_artists": len(request.artist_names),
                        "successful": sum(1 for r in results if r["success"]),
                        "total_emails": sum(len(r["emails"]) for r in results if r["success"]),
                        "average_time": sum(r.get("duration", 0) for r in results) / len(results) if results else 0
                    }
                }
            
            elif request.mode == "deep":
                # Deep discovery mode - maximum information
                results = []
                for artist_name in request.artist_names:
                    result = await scraper.deep_discovery(artist_name)
                    results.append({
                        'artist_name': result.artist_name,
                        'success': result.success,
                        'emails': list(result.contact_info.emails),
                        'phone_numbers': list(result.contact_info.phone_numbers),
                        'social_handles': dict(result.contact_info.social_handles),
                        'management_contacts': dict(result.contact_info.management_contacts),
                        'booking_contacts': dict(result.contact_info.booking_contacts),
                        'websites': list(result.contact_info.websites),
                        'confidence_score': result.contact_info.confidence_score,
                        'platforms_used': result.platforms_scraped,
                        'scraping_time': result.scraping_duration,
                        'error_message': result.error_message
                    })
                    
                return {
                    "mode": "deep",
                    "results": results,
                    "summary": {
                        "total_artists": len(request.artist_names),
                        "successful": sum(1 for r in results if r["success"]),
                        "total_emails": sum(len(r["emails"]) for r in results if r["success"]),
                        "total_phones": sum(len(r["phone_numbers"]) for r in results if r["success"]),
                        "total_social": sum(len(r["social_handles"]) for r in results if r["success"]),
                        "average_confidence": sum(r["confidence_score"] for r in results if r["success"]) / sum(1 for r in results if r["success"]) if any(r["success"] for r in results) else 0
                    }
                }
            
            else:
                # Auto mode - intelligent optimization
                results = await scraper.scrape_artists(
                    request.artist_names,
                    aggressive_mode=False,
                    max_concurrent=request.max_concurrent
                )
                
                formatted_results = []
                for result in results:
                    formatted_results.append({
                        'artist_name': result.artist_name,
                        'success': result.success,
                        'emails': list(result.contact_info.emails),
                        'phone_numbers': list(result.contact_info.phone_numbers),
                        'social_handles': dict(result.contact_info.social_handles),
                        'management_contacts': dict(result.contact_info.management_contacts),
                        'booking_contacts': dict(result.contact_info.booking_contacts),
                        'websites': list(result.contact_info.websites),
                        'confidence_score': result.contact_info.confidence_score,
                        'platforms_used': result.platforms_scraped,
                        'scraping_time': result.scraping_duration,
                        'playwright_used': 'playwright' in ' '.join(result.platforms_scraped).lower(),
                        'error_message': result.error_message
                    })
                
                return {
                    "mode": "auto",
                    "results": formatted_results,
                    "summary": {
                        "total_artists": len(request.artist_names),
                        "successful": sum(1 for r in formatted_results if r["success"]),
                        "total_emails": sum(len(r["emails"]) for r in formatted_results if r["success"]),
                        "total_phones": sum(len(r["phone_numbers"]) for r in formatted_results if r["success"]),
                        "total_social": sum(len(r["social_handles"]) for r in formatted_results if r["success"]),
                        "playwright_triggered": sum(1 for r in formatted_results if r.get("playwright_used", False)),
                        "average_confidence": sum(r["confidence_score"] for r in formatted_results if r["success"]) / sum(1 for r in formatted_results if r["success"]) if any(r["success"] for r in formatted_results) else 0
                    }
                }
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart scraping failed: {str(e)}")


@router.get("/smart/recommendations")
async def get_scraping_recommendations(artist_count: int = Query(..., description="Number of artists to scrape")):
    """Get recommendations for optimal scraping strategy."""
    try:
        scraper = SmartAutoScraper()
        
        # Create dummy list for analysis
        dummy_artists = [f"artist_{i}" for i in range(artist_count)]
        recommendations = scraper.get_scraping_recommendation(dummy_artists)
        
        return recommendations
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


async def _batch_scrape_task(
    task_id: str,
    usernames: List[str],
    include_tracks: bool,
    max_tracks: int
):
    """Background task for batch scraping."""
    # TODO: Implement batch scraping with proper error handling and status updates
    pass