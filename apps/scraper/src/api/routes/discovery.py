from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from ...services.artist_discovery import ArtistDiscoveryService
from ...models.schemas import ArtistProfile, SimilarArtist

router = APIRouter()


class DiscoverSimilarRequest(BaseModel):
    artist_name: str
    genre: Optional[str] = None
    limit: int = 10
    platform: str = "soundcloud"  # soundcloud, spotify, etc.


class DiscoverByGenreRequest(BaseModel):
    genre: str
    limit: int = 20
    min_followers: Optional[int] = None
    max_followers: Optional[int] = None
    country: Optional[str] = None


class AnalyzeArtistRequest(BaseModel):
    artist_name: str
    soundcloud_url: Optional[str] = None


@router.post("/similar", response_model=List[SimilarArtist])
async def discover_similar_artists(request: DiscoverSimilarRequest):
    """Discover artists similar to a given artist using AI analysis."""
    try:
        discovery_service = ArtistDiscoveryService()
        similar_artists = await discovery_service.find_similar_artists(
            artist_name=request.artist_name,
            genre=request.genre,
            limit=request.limit,
            platform=request.platform
        )
        return similar_artists
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


@router.post("/by-genre", response_model=List[ArtistProfile])
async def discover_by_genre(request: DiscoverByGenreRequest):
    """Discover artists by genre with filtering options."""
    try:
        discovery_service = ArtistDiscoveryService()
        artists = await discovery_service.discover_by_genre(
            genre=request.genre,
            limit=request.limit,
            min_followers=request.min_followers,
            max_followers=request.max_followers,
            country=request.country
        )
        return artists
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Genre discovery failed: {str(e)}")


@router.post("/trending")
async def discover_trending_artists(
    genre: Optional[str] = None,
    limit: int = 20,
    timeframe: str = "week"  # week, month, year
):
    """Discover trending artists on SoundCloud."""
    try:
        discovery_service = ArtistDiscoveryService()
        trending = await discovery_service.get_trending_artists(
            genre=genre,
            limit=limit,
            timeframe=timeframe
        )
        return {"trending_artists": trending, "timeframe": timeframe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trending discovery failed: {str(e)}")


@router.post("/analyze", response_model=dict)
async def analyze_artist(request: AnalyzeArtistRequest):
    """Analyze an artist's profile and suggest similar artists."""
    try:
        discovery_service = ArtistDiscoveryService()
        analysis = await discovery_service.analyze_artist(
            artist_name=request.artist_name,
            soundcloud_url=request.soundcloud_url
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Artist analysis failed: {str(e)}")


@router.get("/genres")
async def get_available_genres():
    """Get list of available genres for discovery."""
    return {
        "genres": [
            "Electronic", "Hip Hop", "Pop", "Rock", "Indie", "R&B", "Jazz",
            "Classical", "Country", "Folk", "Reggae", "Latin", "World",
            "House", "Techno", "Dubstep", "Trap", "Lo-fi", "Ambient"
        ]
    }


@router.post("/recommendations")
async def get_artist_recommendations(
    liked_artists: List[str],
    limit: int = 15,
    include_similar: bool = True
):
    """Get artist recommendations based on a list of liked artists."""
    try:
        discovery_service = ArtistDiscoveryService()
        recommendations = await discovery_service.get_recommendations(
            liked_artists=liked_artists,
            limit=limit,
            include_similar=include_similar
        )
        return {
            "recommendations": recommendations,
            "based_on": liked_artists,
            "count": len(recommendations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendations failed: {str(e)}")