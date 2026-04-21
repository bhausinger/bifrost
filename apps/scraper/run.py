#!/usr/bin/env python3
"""Start the Bifrost scraper service."""
import sys
from pathlib import Path

# Add src to Python path so imports work
sys.path.insert(0, str(Path(__file__).parent / "src"))

if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 9999))
    print(f"🚀 Bifrost Scraper starting on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
