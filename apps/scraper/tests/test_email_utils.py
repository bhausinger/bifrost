"""Tests for email extraction, validation, and junk filtering."""
import pytest

from services.email_utils import extract_email, validate_email, is_junk_email


class TestExtractEmail:
    def test_extracts_from_plain_text(self):
        text = "Contact me at artist@gmail.com for bookings"
        assert extract_email(text) == "artist@gmail.com"

    def test_extracts_from_html(self):
        html = '<a href="mailto:booking@artist.com">Email</a>'
        assert extract_email(html) == "booking@artist.com"

    def test_returns_first_valid_email(self):
        # extract_email returns the first valid email (junk filtering is separate)
        text = "reach booking@artist.com or fallback@other.com"
        assert extract_email(text) == "booking@artist.com"

    def test_returns_none_for_empty_string(self):
        assert extract_email("") is None

    def test_returns_none_for_none(self):
        assert extract_email(None) is None

    def test_returns_none_for_no_email(self):
        assert extract_email("no email here, just words") is None

    def test_case_insensitive_extraction(self):
        text = "Email: Artist@Gmail.COM"
        result = extract_email(text)
        assert result is not None
        assert "@" in result

    def test_extracts_email_with_dots_in_local(self):
        text = "reach me: first.last@domain.co.uk"
        assert extract_email(text) == "first.last@domain.co.uk"

    def test_extracts_email_with_plus(self):
        text = "send to user+tag@domain.com please"
        assert extract_email(text) == "user+tag@domain.com"


class TestValidateEmail:
    def test_valid_email_passes(self):
        assert validate_email("artist@gmail.com") == "artist@gmail.com"

    def test_returns_none_for_empty(self):
        assert validate_email("") is None
        assert validate_email(None) is None

    def test_returns_none_for_no_at(self):
        assert validate_email("notanemail") is None

    def test_rejects_hex_hash_local(self):
        assert validate_email("7c33659f530ef43fb4532fc6e83354@domain.com") is None

    def test_rejects_all_digit_local(self):
        assert validate_email("123456@domain.com") is None

    def test_rejects_no_letters_in_local(self):
        assert validate_email("12.34-56@domain.com") is None

    def test_rejects_long_local(self):
        long_local = "a" * 41
        assert validate_email(f"{long_local}@domain.com") is None

    def test_rejects_file_extension_domain(self):
        assert validate_email("image@file.png") is None
        assert validate_email("style@file.css") is None
        assert validate_email("script@file.js") is None

    def test_rejects_bad_domain_format(self):
        assert validate_email("user@") is None
        assert validate_email("user@nodot") is None


class TestIsJunkEmail:
    def test_known_junk_domains(self):
        assert is_junk_email("user@spotify.com") is True
        assert is_junk_email("user@facebook.com") is True
        assert is_junk_email("user@soundcloud.com") is True
        assert is_junk_email("user@example.com") is True

    def test_subdomain_junk(self):
        assert is_junk_email("user@jamiegos.bandcamp.com") is True

    def test_junk_patterns(self):
        assert is_junk_email("noreply@anydomain.com") is True
        assert is_junk_email("support@anydomain.com") is True
        assert is_junk_email("no-reply@anydomain.com") is True
        assert is_junk_email("admin@anydomain.com") is True

    def test_valid_email_not_junk(self):
        assert is_junk_email("artist@gmail.com") is False
        assert is_junk_email("booking@mywebsite.com") is False

    def test_case_insensitive_junk(self):
        assert is_junk_email("NoReply@SomeDomain.com") is True
        assert is_junk_email("SUPPORT@whatever.com") is True
