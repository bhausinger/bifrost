import asyncio
from typing import List, Optional, Dict, Any
import openai
from ..config.settings import settings
from ..models.schemas import ArtistProfile, SimilarArtist
from ..core.logging import get_logger
from .soundcloud_scraper import SoundCloudScraper

logger = get_logger(__name__)


class ArtistDiscoveryService:
    def __init__(self):
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
        self.scraper = SoundCloudScraper()

    async def find_similar_artists(
        self,
        artist_name: str,
        genre: Optional[str] = None,
        limit: int = 10,
        platform: str = "soundcloud"
    ) -> List[SimilarArtist]:
        """Find artists similar to a given artist using AI analysis."""
        logger.info(f"Finding similar artists to: {artist_name}")
        
        try:
            # Use AI to generate similar artists
            similar_artists = await self._ai_find_similar(artist_name, genre, limit)
            
            # Enhance with SoundCloud data if available
            enhanced_artists = []
            for artist in similar_artists:
                try:
                    # Try to get SoundCloud profile
                    profile = await self._get_artist_soundcloud_info(artist['name'])
                    enhanced_artists.append(SimilarArtist(
                        name=artist['name'],
                        soundcloud_url=profile.get('url'),
                        similarity_score=artist['similarity_score'],
                        reason=artist['reason'],
                        follower_count=profile.get('followers_count'),
                        genre=profile.get('genre'),
                        verified=profile.get('verified', False)
                    ))
                except Exception as e:
                    logger.warning(f"Could not enhance {artist['name']} with SoundCloud data: {e}")
                    enhanced_artists.append(SimilarArtist(
                        name=artist['name'],
                        similarity_score=artist['similarity_score'],
                        reason=artist['reason']
                    ))
            
            return enhanced_artists[:limit]
            
        except Exception as e:
            logger.error(f"Failed to find similar artists: {str(e)}")
            # Return fallback results
            return self._fallback_similar_artists(artist_name, limit)

    async def discover_by_genre(
        self,
        genre: str,
        limit: int = 20,
        min_followers: Optional[int] = None,
        max_followers: Optional[int] = None,
        country: Optional[str] = None
    ) -> List[ArtistProfile]:
        """Discover artists by genre with filtering options."""
        logger.info(f"Discovering artists by genre: {genre}")
        
        try:
            # Generate artist names using AI
            artist_names = await self._ai_discover_by_genre(genre, limit, country)
            
            # Get SoundCloud profiles for discovered artists
            artists = []
            for name in artist_names:
                try:
                    # In a real implementation, this would scrape actual SoundCloud profiles
                    profile = await self._create_mock_artist_profile(name, genre)
                    
                    # Apply filters
                    if min_followers and profile.followers_count < min_followers:
                        continue
                    if max_followers and profile.followers_count > max_followers:
                        continue
                    
                    artists.append(profile)
                except Exception as e:
                    logger.warning(f"Could not get profile for {name}: {e}")
                    continue
            
            return artists[:limit]
            
        except Exception as e:
            logger.error(f"Failed to discover by genre: {str(e)}")
            return []

    async def get_trending_artists(
        self,
        genre: Optional[str] = None,
        limit: int = 20,
        timeframe: str = "week"
    ) -> List[ArtistProfile]:
        """Discover trending artists on SoundCloud."""
        logger.info(f"Getting trending artists: {genre} ({timeframe})")
        
        # TODO: Implement actual trending discovery
        # This is a placeholder implementation
        trending_names = [
            f"Trending Artist {i}" for i in range(1, limit + 1)
        ]
        
        artists = []
        for name in trending_names:
            profile = await self._create_mock_artist_profile(name, genre or "Electronic")
            artists.append(profile)
        
        return artists

    async def analyze_artist(
        self,
        artist_name: str,
        soundcloud_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze an artist's profile and suggest similar artists."""
        logger.info(f"Analyzing artist: {artist_name}")
        
        try:
            # Get artist profile
            if soundcloud_url:
                # Extract username from URL and scrape
                username = soundcloud_url.split('/')[-1]
                profile = await self.scraper.scrape_artist(username)
            else:
                # Create mock profile for analysis
                profile = await self._create_mock_artist_profile(artist_name, "Electronic")
            
            # AI analysis
            analysis = await self._ai_analyze_artist(profile)
            
            # Find similar artists
            similar = await self.find_similar_artists(artist_name, limit=5)
            
            return {
                "artist_profile": profile.dict(),
                "genre_analysis": analysis.get("genres", []),
                "mood_analysis": analysis.get("mood", {}),
                "popularity_score": analysis.get("popularity", 0.5),
                "growth_potential": analysis.get("growth", 0.5),
                "similar_artists": [s.dict() for s in similar],
                "recommendations": analysis.get("recommendations", []),
                "market_insights": analysis.get("market", {})
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze artist: {str(e)}")
            return {"error": str(e)}

    async def get_recommendations(
        self,
        liked_artists: List[str],
        limit: int = 15,
        include_similar: bool = True
    ) -> List[SimilarArtist]:
        """Get artist recommendations based on liked artists."""
        logger.info(f"Getting recommendations for: {liked_artists}")
        
        try:
            # Use AI to generate recommendations
            recommendations = await self._ai_get_recommendations(liked_artists, limit)
            
            result = []
            for rec in recommendations:
                result.append(SimilarArtist(
                    name=rec['name'],
                    similarity_score=rec['similarity_score'],
                    reason=rec['reason']
                ))
            
            return result[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get recommendations: {str(e)}")
            return []

    async def _ai_find_similar(
        self, 
        artist_name: str, 
        genre: Optional[str], 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Use AI to find similar artists."""
        if not settings.OPENAI_API_KEY:
            return self._fallback_similar_artists(artist_name, limit)
        
        # TODO: Implement actual OpenAI API call
        # Placeholder implementation
        return [
            {
                "name": f"Similar Artist {i} to {artist_name}",
                "similarity_score": max(0.5, 1.0 - (i * 0.1)),
                "reason": f"Similar style and {genre or 'electronic'} influences"
            }
            for i in range(1, limit + 1)
        ]

    async def _ai_discover_by_genre(
        self, 
        genre: str, 
        limit: int, 
        country: Optional[str]
    ) -> List[str]:
        """Use AI to discover artists by genre."""
        # TODO: Implement actual AI discovery
        location_suffix = f" from {country}" if country else ""
        return [f"{genre} Artist {i}{location_suffix}" for i in range(1, limit + 1)]

    async def _ai_analyze_artist(self, profile: ArtistProfile) -> Dict[str, Any]:
        """Use AI to analyze an artist profile."""
        # TODO: Implement actual AI analysis
        return {
            "genres": ["Electronic", "Ambient"],
            "mood": {"energetic": 0.7, "melodic": 0.8, "dark": 0.3},
            "popularity": 0.6,
            "growth": 0.7,
            "recommendations": ["Focus on melodic elements", "Collaborate with other electronic artists"],
            "market": {"target_audience": "electronic music fans", "potential_reach": "medium"}
        }

    async def _ai_get_recommendations(
        self, 
        liked_artists: List[str], 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Use AI to get recommendations based on liked artists."""
        # TODO: Implement actual AI recommendations
        return [
            {
                "name": f"Recommended Artist {i}",
                "similarity_score": 0.8 - (i * 0.05),
                "reason": f"Based on your interest in {', '.join(liked_artists[:2])}"
            }
            for i in range(1, limit + 1)
        ]

    def _fallback_similar_artists(self, artist_name: str, limit: int) -> List[SimilarArtist]:
        """Fallback method for finding similar artists without AI."""
        return [
            SimilarArtist(
                name=f"Similar to {artist_name} #{i}",
                similarity_score=max(0.4, 0.9 - (i * 0.1)),
                reason="Genre and style similarity"
            )
            for i in range(1, min(limit + 1, 6))
        ]

    async def _get_artist_soundcloud_info(self, artist_name: str) -> Dict[str, Any]:
        """Get SoundCloud info for an artist."""
        # TODO: Implement actual SoundCloud search and profile retrieval
        return {
            "url": f"https://soundcloud.com/{artist_name.lower().replace(' ', '-')}",
            "followers_count": 5000,
            "genre": "Electronic",
            "verified": False
        }

    async def _create_mock_artist_profile(
        self, 
        name: str, 
        genre: str
    ) -> ArtistProfile:
        """Create a mock artist profile for testing."""
        username = name.lower().replace(' ', '-')
        return ArtistProfile(
            id=f"mock_{username}",
            username=username,
            display_name=name,
            url=f"https://soundcloud.com/{username}",
            followers_count=1000 + hash(name) % 50000,
            following_count=500 + hash(name) % 2000,
            track_count=10 + hash(name) % 100,
            description=f"{name} is a {genre} artist",
            genres=[genre],
            verified=hash(name) % 10 == 0  # 10% chance of being verified
        )