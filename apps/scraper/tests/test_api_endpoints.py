"""Tests for FastAPI endpoints in main.py."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from httpx import AsyncClient, ASGITransport
from main import app
from services.models import ScrapedArtist


@pytest.fixture
def mock_scraper():
    """Patch the global scraper instance used by route handlers."""
    mock = AsyncMock()
    with patch("main.scraper", mock):
        yield mock


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestHealthEndpoints:
    async def test_root_returns_ok(self, client: AsyncClient):
        resp = await client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "Bifrost Scraper"

    async def test_health_returns_ok(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestScrapeEndpoint:
    async def test_scrape_soundcloud_returns_artist(
        self, client: AsyncClient, mock_scraper: AsyncMock
    ):
        fake_artist = ScrapedArtist(
            name="TestArtist",
            soundcloud_url="https://soundcloud.com/testartist",
            email="test@example.org",
            followers=5000,
            success=True,
        )
        mock_scraper.scrape.return_value = fake_artist

        resp = await client.post(
            "/scrape/soundcloud",
            json={"url": "https://soundcloud.com/testartist"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TestArtist"
        assert data["email"] == "test@example.org"
        assert data["success"] is True

    async def test_scrape_soundcloud_missing_url_returns_422(
        self, client: AsyncClient
    ):
        resp = await client.post("/scrape/soundcloud", json={})
        assert resp.status_code == 422


class TestDiscoverEndpoint:
    async def test_discover_returns_results(
        self, client: AsyncClient, mock_scraper: AsyncMock
    ):
        mock_scraper.discover.return_value = {
            "results": [{"name": "Found Artist", "followers": 3000}],
            "total_found": 1,
            "filtered_count": 1,
            "seed_artist": "Seed",
            "filter_stats": {},
        }

        resp = await client.post(
            "/discover",
            json={"seed_url": "https://soundcloud.com/seedartist"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["name"] == "Found Artist"

    async def test_discover_missing_seed_url_returns_422(
        self, client: AsyncClient
    ):
        resp = await client.post("/discover", json={})
        assert resp.status_code == 422


class TestDeepScrapeEndpoint:
    async def test_deep_scrape_empty_candidates_returns_400(
        self, client: AsyncClient
    ):
        resp = await client.post("/deep-scrape", json={"candidates": []})
        assert resp.status_code == 400
        assert "No candidates" in resp.json()["detail"]

    async def test_deep_scrape_missing_body_returns_422(
        self, client: AsyncClient
    ):
        resp = await client.post("/deep-scrape", json={})
        assert resp.status_code == 422
