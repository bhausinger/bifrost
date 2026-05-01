"""Tests for email scraper — async email extraction from pages."""
import pytest
from unittest.mock import AsyncMock, MagicMock

import httpx

from services.email_scraper import find_email_from_links, _fetch_email


class TestFetchEmail:
    async def test_extracts_email_from_html(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"content-type": "text/html"}
        mock_resp.text = '<html><body>Contact: booking@artist.com</body></html>'
        mock_client.get.return_value = mock_resp

        result = await _fetch_email(mock_client, "https://artist.com")
        assert result == "booking@artist.com"

    async def test_extracts_mailto_link(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"content-type": "text/html"}
        mock_resp.text = '<a href="mailto:info@artist.com">Email me</a>'
        mock_client.get.return_value = mock_resp

        result = await _fetch_email(mock_client, "https://artist.com")
        assert result == "info@artist.com"

    async def test_returns_none_on_404(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_client.get.return_value = mock_resp

        result = await _fetch_email(mock_client, "https://missing.com")
        assert result is None

    async def test_returns_none_for_non_html(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"content-type": "application/json"}
        mock_client.get.return_value = mock_resp

        result = await _fetch_email(mock_client, "https://api.com/data")
        assert result is None

    async def test_returns_none_on_exception(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.side_effect = httpx.ConnectError("connection refused")

        result = await _fetch_email(mock_client, "https://down.com")
        assert result is None

    async def test_returns_none_when_no_email_in_page(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"content-type": "text/html"}
        mock_resp.text = "<html><body>No contact info here</body></html>"
        mock_client.get.return_value = mock_resp

        result = await _fetch_email(mock_client, "https://noemail.com")
        assert result is None


class TestFindEmailFromLinks:
    async def test_finds_mailto_in_web_profiles(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        user = {}
        web_profiles = [{"url": "mailto:direct@artist.com"}]

        email, source = await find_email_from_links(
            mock_client, user, web_profiles
        )
        assert email == "direct@artist.com"
        assert source == "sc_profile"

    async def test_returns_none_when_no_links(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        user = {}
        web_profiles = []

        email, source = await find_email_from_links(
            mock_client, user, web_profiles
        )
        assert email is None
        assert source == ""
