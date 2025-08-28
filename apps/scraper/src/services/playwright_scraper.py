import asyncio
import re
from typing import List, Dict, Any, Optional, Set
from playwright.async_api import async_playwright, Browser, Page
from playwright_stealth import stealth
import random
import time
from urllib.parse import urljoin, urlparse
import json

from config.settings import settings
from models.schemas import ArtistProfile, ContactInfo
from core.logging import get_logger

logger = get_logger(__name__)


class PlaywrightScraper:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page_timeout = settings.BROWSER_TIMEOUT * 1000  # Convert to milliseconds
        self.user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ]

    async def __aenter__(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=settings.HEADLESS_BROWSER,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-default-apps',
                '--disable-features=VizDisplayCompositor'
            ]
        )
        
        # Create context with random user agent
        self.context = await self.browser.new_context(
            user_agent=random.choice(self.user_agents),
            viewport={'width': 1920, 'height': 1080},
            ignore_https_errors=True
        )
        
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()

    async def _create_stealth_page(self) -> Page:
        """Create a new page with stealth configuration."""
        page = await self.context.new_page()
        await stealth(page)
        
        # Set realistic timeouts
        page.set_default_timeout(self.page_timeout)
        page.set_default_navigation_timeout(self.page_timeout)
        
        return page

    async def _human_delay(self, min_seconds: float = 1.0, max_seconds: float = 3.0):
        """Add human-like random delays."""
        delay = random.uniform(min_seconds, max_seconds)
        await asyncio.sleep(delay)

    async def scrape_artist_contacts(self, artist_name: str) -> ContactInfo:
        """Main method to scrape artist contact information from multiple platforms."""
        logger.info(f"Starting comprehensive contact scraping for artist: {artist_name}")
        
        contact_info = ContactInfo(
            artist_name=artist_name,
            emails=set(),
            phone_numbers=set(),
            social_handles={},
            websites=set(),
            management_contacts={},
            booking_contacts={}
        )

        # Multi-platform scraping strategy
        platforms = [
            self._scrape_soundcloud,
            self._scrape_instagram,
            self._scrape_twitter,
            self._scrape_youtube,
            self._scrape_bandcamp,
            self._scrape_spotify_for_you
        ]

        for platform_scraper in platforms:
            try:
                await self._human_delay(1, 2)  # Rate limiting between platforms
                platform_contacts = await platform_scraper(artist_name)
                contact_info = self._merge_contact_info(contact_info, platform_contacts)
            except Exception as e:
                logger.warning(f"Failed to scrape {platform_scraper.__name__} for {artist_name}: {str(e)}")
                continue

        # Follow website links for deeper contact discovery
        if contact_info.websites:
            for website in list(contact_info.websites)[:3]:  # Limit to 3 websites
                try:
                    await self._human_delay(2, 4)
                    website_contacts = await self._scrape_website_contacts(website)
                    contact_info = self._merge_contact_info(contact_info, website_contacts)
                except Exception as e:
                    logger.warning(f"Failed to scrape website {website}: {str(e)}")

        logger.info(f"Completed scraping for {artist_name}. Found {len(contact_info.emails)} emails, {len(contact_info.phone_numbers)} phone numbers")
        return contact_info

    async def _scrape_soundcloud(self, artist_name: str) -> ContactInfo:
        """Scrape SoundCloud for artist contact information."""
        contact_info = ContactInfo(artist_name=artist_name)
        page = await self._create_stealth_page()
        
        try:
            # Search for artist on SoundCloud
            search_url = f"https://soundcloud.com/search?q={artist_name.replace(' ', '%20')}"
            await page.goto(search_url, wait_until='networkidle')
            
            # Wait for search results
            await page.wait_for_selector('[data-testid="search-results"]', timeout=10000)
            
            # Click on first artist result
            first_result = await page.query_selector('a[href*="/"]')
            if first_result:
                await first_result.click()
                await page.wait_for_load_state('networkidle')
                
                # Extract profile information
                profile_text = await page.inner_text('body')
                contact_info.emails.update(self._extract_emails(profile_text))
                contact_info.phone_numbers.update(self._extract_phone_numbers(profile_text))
                contact_info.websites.update(self._extract_websites(profile_text))
                
                # Look for social links
                social_links = await page.query_selector_all('a[href*="instagram.com"], a[href*="twitter.com"], a[href*="youtube.com"], a[href*="facebook.com"]')
                for link in social_links:
                    href = await link.get_attribute('href')
                    if href:
                        platform = self._identify_social_platform(href)
                        if platform:
                            contact_info.social_handles[platform] = href

        except Exception as e:
            logger.error(f"Error scraping SoundCloud for {artist_name}: {str(e)}")
        finally:
            await page.close()
        
        return contact_info

    async def _scrape_instagram(self, artist_name: str) -> ContactInfo:
        """Scrape Instagram for artist contact information."""
        contact_info = ContactInfo(artist_name=artist_name)
        page = await self._create_stealth_page()
        
        try:
            # Search for artist on Instagram (using web version)
            search_query = artist_name.replace(' ', '%20')
            search_url = f"https://www.instagram.com/explore/search/keyword/?q={search_query}"
            
            await page.goto("https://www.instagram.com", wait_until='networkidle')
            await self._human_delay(2, 3)
            
            # Navigate to search
            await page.goto(search_url, wait_until='networkidle')
            await self._human_delay(2, 4)
            
            # Extract any visible profile information
            page_content = await page.inner_text('body')
            contact_info.emails.update(self._extract_emails(page_content))
            contact_info.websites.update(self._extract_websites(page_content))
            
        except Exception as e:
            logger.error(f"Error scraping Instagram for {artist_name}: {str(e)}")
        finally:
            await page.close()
            
        return contact_info

    async def _scrape_twitter(self, artist_name: str) -> ContactInfo:
        """Scrape Twitter/X for artist contact information."""
        contact_info = ContactInfo(artist_name=artist_name)
        page = await self._create_stealth_page()
        
        try:
            # Search for artist on Twitter/X
            search_query = artist_name.replace(' ', '%20')
            search_url = f"https://twitter.com/search?q={search_query}&src=typed_query&f=user"
            
            await page.goto(search_url, wait_until='networkidle')
            await self._human_delay(3, 5)
            
            # Extract profile information from search results
            page_content = await page.inner_text('body')
            contact_info.emails.update(self._extract_emails(page_content))
            contact_info.websites.update(self._extract_websites(page_content))
            
        except Exception as e:
            logger.error(f"Error scraping Twitter for {artist_name}: {str(e)}")
        finally:
            await page.close()
            
        return contact_info

    async def _scrape_youtube(self, artist_name: str) -> ContactInfo:
        """Scrape YouTube for artist contact information."""
        contact_info = ContactInfo(artist_name=artist_name)
        page = await self._create_stealth_page()
        
        try:
            # Search for artist on YouTube
            search_query = artist_name.replace(' ', '+')
            search_url = f"https://www.youtube.com/results?search_query={search_query}&sp=EgIQAg%253D%253D"  # Channel filter
            
            await page.goto(search_url, wait_until='networkidle')
            await self._human_delay(2, 4)
            
            # Click on first channel result
            channel_links = await page.query_selector_all('a[href*="/channel/"], a[href*="/@"]')
            if channel_links:
                first_channel = channel_links[0]
                await first_channel.click()
                await page.wait_for_load_state('networkidle')
                
                # Navigate to About section
                try:
                    about_tab = await page.query_selector('a[href*="/about"]')
                    if about_tab:
                        await about_tab.click()
                        await page.wait_for_load_state('networkidle')
                        await self._human_delay(2, 3)
                except:
                    pass
                
                # Extract contact information
                page_content = await page.inner_text('body')
                contact_info.emails.update(self._extract_emails(page_content))
                contact_info.websites.update(self._extract_websites(page_content))
                
        except Exception as e:
            logger.error(f"Error scraping YouTube for {artist_name}: {str(e)}")
        finally:
            await page.close()
            
        return contact_info

    async def _scrape_bandcamp(self, artist_name: str) -> ContactInfo:
        """Scrape Bandcamp for artist contact information."""
        contact_info = ContactInfo(artist_name=artist_name)
        page = await self._create_stealth_page()
        
        try:
            # Search for artist on Bandcamp
            search_query = artist_name.replace(' ', '%20')
            search_url = f"https://bandcamp.com/search?q={search_query}"
            
            await page.goto(search_url, wait_until='networkidle')
            await self._human_delay(2, 3)
            
            # Click on first artist result
            artist_links = await page.query_selector_all('.searchresult .heading a')
            if artist_links:
                first_artist = artist_links[0]
                href = await first_artist.get_attribute('href')
                if href and 'bandcamp.com' in href:
                    await page.goto(href, wait_until='networkidle')
                    await self._human_delay(2, 3)
                    
                    # Extract contact information
                    page_content = await page.inner_text('body')
                    contact_info.emails.update(self._extract_emails(page_content))
                    contact_info.websites.update(self._extract_websites(page_content))
                    
        except Exception as e:
            logger.error(f"Error scraping Bandcamp for {artist_name}: {str(e)}")
        finally:
            await page.close()
            
        return contact_info

    async def _scrape_spotify_for_you(self, artist_name: str) -> ContactInfo:
        """Scrape Spotify for You (external links) for artist contact information."""
        contact_info = ContactInfo(artist_name=artist_name)
        page = await self._create_stealth_page()
        
        try:
            # Search for artist on Spotify for You
            search_query = artist_name.replace(' ', '%20')
            search_url = f"https://open.spotify.com/search/{search_query}"
            
            await page.goto(search_url, wait_until='networkidle')
            await self._human_delay(3, 5)
            
            # Look for artist profile and external links
            page_content = await page.inner_text('body')
            contact_info.websites.update(self._extract_websites(page_content))
            
        except Exception as e:
            logger.error(f"Error scraping Spotify for {artist_name}: {str(e)}")
        finally:
            await page.close()
            
        return contact_info

    async def _scrape_website_contacts(self, website_url: str) -> ContactInfo:
        """Scrape a website for contact information."""
        contact_info = ContactInfo(artist_name="")
        page = await self._create_stealth_page()
        
        try:
            await page.goto(website_url, wait_until='networkidle')
            await self._human_delay(1, 2)
            
            # Look for contact page links
            contact_links = await page.query_selector_all('a[href*="contact"], a[href*="booking"], a[href*="management"]')
            
            pages_to_check = [website_url]  # Start with main page
            
            # Add contact pages
            for link in contact_links[:3]:  # Limit to 3 contact pages
                href = await link.get_attribute('href')
                if href:
                    full_url = urljoin(website_url, href)
                    pages_to_check.append(full_url)
            
            # Check each page for contact info
            for page_url in pages_to_check:
                try:
                    await page.goto(page_url, wait_until='networkidle')
                    await self._human_delay(1, 2)
                    
                    page_content = await page.inner_text('body')
                    contact_info.emails.update(self._extract_emails(page_content))
                    contact_info.phone_numbers.update(self._extract_phone_numbers(page_content))
                    
                    # Look for management/booking specific emails
                    management_emails = self._extract_management_emails(page_content)
                    contact_info.management_contacts.update(management_emails)
                    
                    booking_emails = self._extract_booking_emails(page_content)
                    contact_info.booking_contacts.update(booking_emails)
                    
                except Exception as e:
                    logger.warning(f"Failed to scrape page {page_url}: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error scraping website {website_url}: {str(e)}")
        finally:
            await page.close()
            
        return contact_info

    def _extract_emails(self, text: str) -> Set[str]:
        """Extract email addresses from text."""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        
        # Filter out common non-contact emails
        filtered_emails = set()
        exclude_patterns = [
            r'.*@(gmail|yahoo|hotmail|outlook)\.com$',  # Personal emails might be valuable
            r'.*@(example|test|demo)\.com$',
            r'.*@(no-reply|noreply)\..*',
            r'.*support@.*',
            r'.*info@.*'
        ]
        
        for email in emails:
            is_excluded = False
            for pattern in exclude_patterns[1:]:  # Skip personal email exclusion
                if re.match(pattern, email, re.IGNORECASE):
                    is_excluded = True
                    break
            
            if not is_excluded:
                filtered_emails.add(email.lower())
                
        return filtered_emails

    def _extract_phone_numbers(self, text: str) -> Set[str]:
        """Extract phone numbers from text."""
        phone_patterns = [
            r'\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}',  # US numbers
            r'\+[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}',  # International
            r'\([0-9]{3}\)[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}',  # (xxx) xxx-xxxx
        ]
        
        phone_numbers = set()
        for pattern in phone_patterns:
            numbers = re.findall(pattern, text)
            phone_numbers.update(numbers)
            
        return phone_numbers

    def _extract_websites(self, text: str) -> Set[str]:
        """Extract website URLs from text."""
        url_pattern = r'https?://[^\s<>"]{2,}'
        urls = re.findall(url_pattern, text)
        
        # Filter for relevant websites
        filtered_urls = set()
        for url in urls:
            # Remove common social media and irrelevant URLs
            if not any(domain in url for domain in ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'spotify.com']):
                if any(domain in url for domain in ['.com', '.net', '.org', '.co']):
                    filtered_urls.add(url)
                    
        return filtered_urls

    def _extract_management_emails(self, text: str) -> Dict[str, str]:
        """Extract management-specific contact emails."""
        management_emails = {}
        
        # Look for management-related keywords near email addresses
        management_keywords = ['management', 'manager', 'mgmt', 'agent', 'representation']
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        
        lines = text.split('\n')
        for line in lines:
            for keyword in management_keywords:
                if keyword.lower() in line.lower():
                    emails = re.findall(email_pattern, line)
                    for email in emails:
                        management_emails[f'{keyword}_contact'] = email.lower()
                        
        return management_emails

    def _extract_booking_emails(self, text: str) -> Dict[str, str]:
        """Extract booking-specific contact emails."""
        booking_emails = {}
        
        # Look for booking-related keywords near email addresses
        booking_keywords = ['booking', 'book', 'shows', 'gigs', 'tour', 'events']
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        
        lines = text.split('\n')
        for line in lines:
            for keyword in booking_keywords:
                if keyword.lower() in line.lower():
                    emails = re.findall(email_pattern, line)
                    for email in emails:
                        booking_emails[f'{keyword}_contact'] = email.lower()
                        
        return booking_emails

    def _identify_social_platform(self, url: str) -> Optional[str]:
        """Identify social media platform from URL."""
        platforms = {
            'instagram.com': 'instagram',
            'twitter.com': 'twitter',
            'x.com': 'twitter',
            'youtube.com': 'youtube',
            'facebook.com': 'facebook',
            'tiktok.com': 'tiktok',
            'linkedin.com': 'linkedin'
        }
        
        for domain, platform in platforms.items():
            if domain in url:
                return platform
                
        return None

    def _merge_contact_info(self, base: ContactInfo, new: ContactInfo) -> ContactInfo:
        """Merge contact information from multiple sources."""
        base.emails.update(new.emails)
        base.phone_numbers.update(new.phone_numbers)
        base.websites.update(new.websites)
        base.social_handles.update(new.social_handles)
        base.management_contacts.update(new.management_contacts)
        base.booking_contacts.update(new.booking_contacts)
        
        return base