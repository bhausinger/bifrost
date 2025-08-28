from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class TrackInfo(BaseModel):
    id: str
    title: str
    url: HttpUrl
    duration: Optional[int] = None  # in seconds
    play_count: Optional[int] = None
    like_count: Optional[int] = None
    repost_count: Optional[int] = None
    comment_count: Optional[int] = None
    created_at: Optional[datetime] = None
    genre: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = None
    downloadable: bool = False
    artwork_url: Optional[HttpUrl] = None


class ArtistProfile(BaseModel):
    id: str
    username: str
    display_name: str
    url: HttpUrl
    avatar_url: Optional[HttpUrl] = None
    banner_url: Optional[HttpUrl] = None
    followers_count: Optional[int] = None
    following_count: Optional[int] = None
    track_count: Optional[int] = None
    playlist_count: Optional[int] = None
    description: Optional[str] = None
    location: Optional[str] = None
    verified: bool = False
    created_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    tracks: List[TrackInfo] = []
    genres: List[str] = []
    total_plays: Optional[int] = None
    total_likes: Optional[int] = None


class SimilarArtist(BaseModel):
    name: str
    soundcloud_url: Optional[HttpUrl] = None
    similarity_score: float  # 0.0 to 1.0
    reason: str  # Why this artist is similar
    follower_count: Optional[int] = None
    genre: Optional[str] = None
    verified: bool = False


class ScrapingTask(BaseModel):
    task_id: str
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    target: str  # Artist username or URL
    task_type: str  # "artist", "track", "search", "batch"
    progress: float = 0.0  # 0.0 to 1.0
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    estimated_completion: Optional[datetime] = None


class DiscoveryResult(BaseModel):
    artists: List[ArtistProfile]
    total_found: int
    search_criteria: Dict[str, Any]
    search_time: float  # in seconds
    next_page_token: Optional[str] = None


class ArtistAnalysis(BaseModel):
    artist: ArtistProfile
    genre_classification: List[str]
    mood_analysis: Dict[str, float]  # emotion -> confidence
    popularity_metrics: Dict[str, Any]
    growth_trends: Dict[str, Any]
    similar_artists: List[SimilarArtist]
    recommendations: List[str]
    market_insights: Dict[str, Any]


class SearchFilter(BaseModel):
    genre: Optional[str] = None
    min_followers: Optional[int] = None
    max_followers: Optional[int] = None
    location: Optional[str] = None
    verified_only: bool = False
    min_track_count: Optional[int] = None
    created_after: Optional[datetime] = None
    sort_by: str = "relevance"  # relevance, followers, recent, popular


class ContactInfo(BaseModel):
    artist_name: str
    emails: set = set()
    phone_numbers: set = set()
    social_handles: Dict[str, str] = {}  # platform -> url
    websites: set = set()
    management_contacts: Dict[str, str] = {}  # type -> email
    booking_contacts: Dict[str, str] = {}  # type -> email
    confidence_score: float = 0.0
    source_platforms: List[str] = []
    last_updated: Optional[datetime] = None

    class Config:
        arbitrary_types_allowed = True


class EmailClassification(BaseModel):
    email: str
    classification: str  # personal, management, booking, press, general
    confidence: float
    context: Optional[str] = None
    is_valid: bool = True
    deliverability_score: float = 0.0


class ScrapingResult(BaseModel):
    artist_name: str
    contact_info: ContactInfo
    email_classifications: List[EmailClassification] = []
    scraping_duration: float
    platforms_scraped: List[str]
    success: bool
    error_message: Optional[str] = None