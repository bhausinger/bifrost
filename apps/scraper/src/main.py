import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from config.settings import settings
from api.routes import soundcloud, discovery, health
from core.logging import setup_logging
try:
    from core.database import init_db
    database_available = True
except ImportError:
    database_available = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    if database_available:
        await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Campaign Manager Scraper Service",
    description="SoundCloud scraping and artist discovery service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(soundcloud.router, prefix="/api/soundcloud", tags=["soundcloud"])
app.include_router(discovery.router, prefix="/api/discovery", tags=["discovery"])

# Compatibility route for ScraperModal (calls /scrape/soundcloud)
from api.routes.soundcloud import scrape_single_artist
app.post("/scrape/soundcloud")(scrape_single_artist)


@app.get("/")
async def root():
    return {"message": "Campaign Manager Scraper Service", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug",
    )