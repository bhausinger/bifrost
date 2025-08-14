import asyncio
import aiohttp
import time
from typing import List, Optional, Dict, Any
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
import json

from ..config.settings import settings
from ..models.schemas import ArtistProfile, TrackInfo
from ..core.logging import get_logger

logger = get_logger(__name__)


class SoundCloudScraper:
    def __init__(self):
        self.base_url = settings.SOUNDCLOUD_BASE_URL
        self.session = None
        self.headers = {
            'User-Agent': settings.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers=self.headers,
            timeout=aiohttp.ClientTimeout(total=settings.BROWSER_TIMEOUT)
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def _get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=settings.BROWSER_TIMEOUT)
            )
        return self.session

    async def _make_request(self, url: str) -> str:
        """Make an HTTP request with rate limiting."""
        session = await self._get_session()
        
        # Rate limiting
        await asyncio.sleep(settings.SCRAPING_DELAY)
        
        try:
            async with session.get(url) as response:
                response.raise_for_status()
                content = await response.text()
                logger.info(f"Successfully fetched: {url}")
                return content
        except Exception as e:
            logger.error(f"Request failed for {url}: {str(e)}")
            raise

    async def scrape_artist(
        self, 
        username: str, 
        include_tracks: bool = True, 
        max_tracks: int = 50
    ) -> ArtistProfile:
        """Scrape a SoundCloud artist profile."""
        logger.info(f"Scraping artist: {username}")
        
        artist_url = f"{self.base_url}/{username}"
        content = await self._make_request(artist_url)
        soup = BeautifulSoup(content, 'html.parser')
        
        # Extract artist data from page scripts
        artist_data = self._extract_artist_data(soup, artist_url)
        
        # Get tracks if requested
        tracks = []
        if include_tracks:
            tracks = await self._scrape_artist_tracks(username, max_tracks)
        
        return ArtistProfile(
            id=artist_data.get('id', username),
            username=username,
            display_name=artist_data.get('display_name', username),
            url=artist_url,
            avatar_url=artist_data.get('avatar_url'),
            banner_url=artist_data.get('banner_url'),
            followers_count=artist_data.get('followers_count'),
            following_count=artist_data.get('following_count'),
            track_count=artist_data.get('track_count'),
            description=artist_data.get('description'),
            location=artist_data.get('location'),
            verified=artist_data.get('verified', False),
            tracks=tracks,
            genres=artist_data.get('genres', []),
            total_plays=sum(track.play_count or 0 for track in tracks),
            total_likes=sum(track.like_count or 0 for track in tracks)
        )

    async def scrape_track(self, track_url: str) -> TrackInfo:
        """Scrape a specific SoundCloud track."""
        logger.info(f"Scraping track: {track_url}")
        
        content = await self._make_request(track_url)
        soup = BeautifulSoup(content, 'html.parser')
        
        track_data = self._extract_track_data(soup, track_url)
        
        return TrackInfo(
            id=track_data.get('id', ''),
            title=track_data.get('title', ''),
            url=track_url,
            duration=track_data.get('duration'),
            play_count=track_data.get('play_count'),
            like_count=track_data.get('like_count'),
            repost_count=track_data.get('repost_count'),
            comment_count=track_data.get('comment_count'),
            genre=track_data.get('genre'),
            tags=track_data.get('tags', []),
            description=track_data.get('description'),
            downloadable=track_data.get('downloadable', False),
            artwork_url=track_data.get('artwork_url')
        )

    async def search(
        self, 
        query: str, 
        limit: int = 20, 
        search_type: str = "artists"
    ) -> List[Dict[str, Any]]:
        """Search SoundCloud for artists, tracks, or playlists."""
        logger.info(f"Searching SoundCloud: {query} ({search_type})")
        
        # TODO: Implement actual SoundCloud search
        # This is a placeholder implementation
        return [
            {
                "id": f"search_result_{i}",
                "name": f"Result {i} for {query}",
                "type": search_type,
                "url": f"{self.base_url}/search_result_{i}",
                "description": f"Search result {i}"
            }
            for i in range(min(limit, 10))
        ]

    async def _scrape_artist_tracks(self, username: str, max_tracks: int) -> List[TrackInfo]:
        """Scrape tracks from an artist's profile."""
        tracks_url = f"{self.base_url}/{username}/tracks"
        
        try:
            content = await self._make_request(tracks_url)
            soup = BeautifulSoup(content, 'html.parser')
            
            # TODO: Implement actual track extraction from artist page
            # This is a placeholder implementation
            return [
                TrackInfo(
                    id=f"track_{i}",
                    title=f"Track {i}",
                    url=f"{tracks_url}/track_{i}",
                    play_count=1000 * i,
                    like_count=100 * i
                )
                for i in range(min(max_tracks, 5))
            ]
        except Exception as e:
            logger.error(f"Failed to scrape tracks for {username}: {str(e)}")
            return []

    def _extract_artist_data(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract artist data from page HTML."""
        # TODO: Implement actual data extraction from SoundCloud page
        # This is a placeholder implementation
        
        title_tag = soup.find('title')
        title = title_tag.text if title_tag else "Unknown Artist"
        
        return {
            'id': 'placeholder_id',
            'display_name': title.split(' | ')[0] if ' | ' in title else title,
            'followers_count': 1000,
            'following_count': 500,
            'track_count': 25,
            'description': 'Placeholder description',
            'location': 'Unknown',
            'verified': False,
            'genres': ['Electronic']
        }

    def _extract_track_data(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract track data from page HTML."""
        # TODO: Implement actual track data extraction
        # This is a placeholder implementation
        
        title_tag = soup.find('title')
        title = title_tag.text if title_tag else "Unknown Track"
        
        return {
            'id': 'placeholder_track_id',
            'title': title.split(' | ')[0] if ' | ' in title else title,
            'duration': 180,  # 3 minutes
            'play_count': 5000,
            'like_count': 250,
            'repost_count': 50,
            'comment_count': 25,
            'genre': 'Electronic',
            'tags': ['electronic', 'music'],
            'description': 'Placeholder track description',
            'downloadable': False
        }