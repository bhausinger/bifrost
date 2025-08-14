from fastapi import APIRouter
from datetime import datetime
import asyncio
import redis.asyncio as redis
from ...config.settings import settings

router = APIRouter()


@router.get("/")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "scraper",
        "version": "1.0.0"
    }


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check including dependencies."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "scraper",
        "version": "1.0.0",
        "dependencies": {}
    }
    
    # Check Redis connection
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        health_status["dependencies"]["redis"] = "healthy"
        await redis_client.close()
    except Exception as e:
        health_status["dependencies"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check database connection
    try:
        # TODO: Add database health check when implemented
        health_status["dependencies"]["database"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status