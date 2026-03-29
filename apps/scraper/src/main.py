"""
Bifrost Scraper — SoundCloud artist discovery & profile scraping.
Minimal FastAPI app. No database, no Redis, no Playwright.
"""
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.soundcloud_scraper import SoundCloudScraper

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
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ───────────────────────────────────────────


class ScrapeRequest(BaseModel):
    url: str


class DiscoverRequest(BaseModel):
    seed_url: str
    min_followers: int = 0
    max_followers: int = 999_999_999
    genres: Optional[list[str]] = None
    max_results: int = 50


# ── Routes ────────────────────────────────────────────────────────────


@app.get("/")
async def root():
    return {"service": "Bifrost Scraper", "version": "2.0.0", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/scrape/soundcloud")
async def scrape_soundcloud(req: ScrapeRequest):
    """Scrape a single SoundCloud profile. Used by ScraperModal."""
    result = await scraper.scrape(req.url)
    return result.to_api_response()


@app.post("/discover")
async def discover_artists(req: DiscoverRequest):
    """Discover artists similar to a seed profile. Used by LeadGeneratorModal."""
    return await scraper.discover(
        seed_url=req.seed_url,
        min_followers=req.min_followers,
        max_followers=req.max_followers,
        genres=req.genres,
        max_results=req.max_results,
    )
