#!/usr/bin/env python3
"""
Entry point for the scraper service
"""
import sys
import os
from pathlib import Path
import uvicorn

# Add src directory to Python path
src_dir = Path(__file__).parent / "src"
sys.path.insert(0, str(src_dir))

if __name__ == "__main__":
    # Import after setting up the path
    from config.settings import settings
    
    print("🚀 Starting Campaign Manager Scraper Service")
    print(f"📍 Port: {settings.PORT}")
    print(f"🔧 Debug: {settings.DEBUG}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug",
    )