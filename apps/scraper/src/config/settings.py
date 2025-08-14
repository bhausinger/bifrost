from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "Campaign Manager Scraper"
    DEBUG: bool = False
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/scraper_db"
    
    # Redis for caching and task queue
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://localhost:5000"]
    
    # SoundCloud scraping settings
    SOUNDCLOUD_BASE_URL: str = "https://soundcloud.com"
    SCRAPING_DELAY: float = 1.0  # Delay between requests
    MAX_CONCURRENT_REQUESTS: int = 5
    USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    # Browser automation
    HEADLESS_BROWSER: bool = True
    BROWSER_TIMEOUT: int = 30
    
    # AI/ML APIs
    OPENAI_API_KEY: str = ""
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 3600  # 1 hour
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/scraper.log"
    
    # File storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()