"""
Bifrost Scraper — SoundCloud artist discovery & profile scraping.
Minimal FastAPI app. No database, no Redis, no Playwright.
"""
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.soundcloud_scraper import SoundCloudScraper
from services.multi_tap import multi_tap_discover
from services.deep_scrape import deep_scrape_batch

# ── Shared scraper instance ───────────────────────────────────────────

scraper: Optional[SoundCloudScraper] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scraper
    scraper = SoundCloudScraper()
    await scraper.__aenter__()
    yield
    await scraper.__aexit__(None, None, None)


app = FastAPI(
    title="Bifrost Scraper",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ───────────────────────────────────────────────────


class ScrapeRequest(BaseModel):
    url: str


class DiscoverRequest(BaseModel):
    seed_url: str
    min_followers: int = 0
    max_followers: int = 999_999_999
    genres: Optional[list[str]] = None
    max_results: int = 50
    uploaded_within_days: Optional[int] = None


class MultiTapDiscoverRequest(BaseModel):
    genre: str
    min_followers: int = 2000
    max_followers: int = 50000
    seed_url: Optional[str] = None
    uploaded_within_days: Optional[int] = None
    target_pool: int = 1000


class DeepScrapeRequest(BaseModel):
    candidates: list[dict[str, Any]]


# ── Routes ────────────────────────────────────────────────────────────


@app.get("/")
async def root():
    return {"service": "Bifrost Scraper", "version": "3.0.0", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/scrape/soundcloud")
async def scrape_soundcloud(req: ScrapeRequest):
    """Scrape a single SoundCloud profile."""
    result = await scraper.scrape(req.url)
    return result.to_api_response()


@app.post("/discover")
async def discover_artists(req: DiscoverRequest):
    """Discover artists similar to a seed profile."""
    return await scraper.discover(
        seed_url=req.seed_url,
        min_followers=req.min_followers,
        max_followers=req.max_followers,
        genres=req.genres,
        max_results=req.max_results,
        uploaded_within_days=req.uploaded_within_days,
    )


@app.post("/multi-tap-discover")
async def multi_tap_discover_endpoint(req: MultiTapDiscoverRequest):
    """Multi-tap genre-driven discovery — 5 parallel sources."""
    try:
        return await multi_tap_discover(
            scraper,
            genre=req.genre,
            min_followers=req.min_followers,
            max_followers=req.max_followers,
            seed_url=req.seed_url,
            uploaded_within_days=req.uploaded_within_days,
            target_pool=req.target_pool,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-tap discovery failed: {e}")


@app.post("/multi-tap-discover-stream")
async def multi_tap_discover_stream(req: MultiTapDiscoverRequest):
    """Streaming multi-tap discovery with SSE progress events."""

    async def event_stream():
        progress_queue: asyncio.Queue = asyncio.Queue()

        async def on_progress(event: str, data: dict):
            await progress_queue.put({"event": event, "data": data})

        task = asyncio.create_task(multi_tap_discover(
            scraper,
            genre=req.genre,
            min_followers=req.min_followers,
            max_followers=req.max_followers,
            seed_url=req.seed_url,
            uploaded_within_days=req.uploaded_within_days,
            target_pool=req.target_pool,
            progress_callback=on_progress,
        ))

        while not task.done():
            try:
                msg = await asyncio.wait_for(progress_queue.get(), timeout=0.5)
                yield f"event: {msg['event']}\ndata: {json.dumps(msg['data'])}\n\n"
            except asyncio.TimeoutError:
                continue

        # Drain remaining queued events
        while not progress_queue.empty():
            msg = await progress_queue.get()
            yield f"event: {msg['event']}\ndata: {json.dumps(msg['data'])}\n\n"

        result = await task
        yield f"event: complete\ndata: {json.dumps(result)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/deep-scrape")
async def deep_scrape_endpoint(req: DeepScrapeRequest):
    """Deep scrape candidates for emails — batch enrichment."""
    if not req.candidates:
        raise HTTPException(status_code=400, detail="No candidates provided")

    try:
        results = await deep_scrape_batch(scraper, req.candidates, concurrency=5)
        emails_found = sum(1 for r in results if r.get("email"))
        return {"results": results, "total": len(results), "emails_found": emails_found}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deep scrape failed: {e}")
