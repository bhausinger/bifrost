import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, Boolean, Text, Float
from datetime import datetime
from typing import Optional

from ..config.settings import settings
from .logging import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    pass


class ScrapedArtist(Base):
    __tablename__ = "scraped_artists"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    soundcloud_url: Mapped[str] = mapped_column(String(500))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    followers_count: Mapped[Optional[int]] = mapped_column(Integer)
    following_count: Mapped[Optional[int]] = mapped_column(Integer)
    track_count: Mapped[Optional[int]] = mapped_column(Integer)
    description: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(String(200))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    genres: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    total_plays: Mapped[Optional[int]] = mapped_column(Integer)
    total_likes: Mapped[Optional[int]] = mapped_column(Integer)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScrapedTrack(Base):
    __tablename__ = "scraped_tracks"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    soundcloud_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    artist_username: Mapped[str] = mapped_column(String(100), index=True)
    url: Mapped[str] = mapped_column(String(500))
    duration: Mapped[Optional[int]] = mapped_column(Integer)
    play_count: Mapped[Optional[int]] = mapped_column(Integer)
    like_count: Mapped[Optional[int]] = mapped_column(Integer)
    repost_count: Mapped[Optional[int]] = mapped_column(Integer)
    comment_count: Mapped[Optional[int]] = mapped_column(Integer)
    genre: Mapped[Optional[str]] = mapped_column(String(100))
    tags: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    description: Mapped[Optional[str]] = mapped_column(Text)
    downloadable: Mapped[bool] = mapped_column(Boolean, default=False)
    artwork_url: Mapped[Optional[str]] = mapped_column(String(500))
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DiscoveryTask(Base):
    __tablename__ = "discovery_tasks"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    task_type: Mapped[str] = mapped_column(String(50))  # artist, search, discovery
    target: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    result: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


# Database engine and session
engine = None
async_session = None


async def init_db():
    """Initialize the database connection."""
    global engine, async_session
    
    try:
        # Convert PostgreSQL URL to async version
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        engine = create_async_engine(
            db_url,
            echo=settings.DEBUG,
            pool_size=10,
            max_overflow=20
        )
        
        async_session = async_sessionmaker(
            engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise


async def get_db_session() -> AsyncSession:
    """Get a database session."""
    if not async_session:
        await init_db()
    
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def close_db():
    """Close database connections."""
    global engine
    if engine:
        await engine.dispose()
        logger.info("Database connections closed")