import asyncio
import time
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
import threading

from services.soundcloud_scraper import SoundCloudScraper
from services.playwright_scraper import PlaywrightScraper
from services.email_classifier import EmailClassifier
from services.contact_validator import ContactValidator
from models.schemas import ContactInfo, ScrapingResult, EmailClassification
from core.logging import get_logger

logger = get_logger(__name__)


class HybridContactScraper:
    """
    Hybrid scraper that combines BeautifulSoup (fast) and Playwright (comprehensive)
    for optimal contact discovery.
    """
    
    def __init__(self):
        self.email_classifier = EmailClassifier()
        self.contact_validator = ContactValidator()
        self._scraper_lock = threading.Lock()
        
    async def scrape_artist_contacts(
        self, 
        artist_name: str, 
        use_playwright: bool = None,  # None = auto-decide
        max_platforms: int = 6
    ) -> ScrapingResult:
        """
        Main method to scrape artist contact information using hybrid approach.
        
        Args:
            artist_name: Name of the artist to scrape
            use_playwright: None=auto-decide, True=force Playwright, False=static only
            max_platforms: Maximum number of platforms to scrape
            
        Returns:
            ScrapingResult with contact information and metadata
        """
        start_time = time.time()
        logger.info(f"Starting hybrid scraping for artist: {artist_name}")
        
        try:
            # Initialize contact info
            contact_info = ContactInfo(
                artist_name=artist_name,
                emails=set(),
                phone_numbers=set(),
                social_handles={},
                websites=set(),
                management_contacts={},
                booking_contacts={}
            )
            
            platforms_scraped = []
            
            # Phase 1: Fast static scraping with BeautifulSoup
            logger.info(f"Phase 1: Static scraping for {artist_name}")
            static_contacts = await self._static_scraping_phase(artist_name)
            contact_info = self._merge_contact_info(contact_info, static_contacts)
            platforms_scraped.extend(['soundcloud_static'])
            
            # Phase 2: Auto-decide or use dynamic scraping with Playwright
            should_use_playwright = self._should_use_playwright(use_playwright, contact_info)
            
            if should_use_playwright:
                logger.info(f"Phase 2: Dynamic scraping for {artist_name} (auto-triggered)")
                dynamic_contacts = await self._dynamic_scraping_phase(artist_name, max_platforms)
                contact_info = self._merge_contact_info(contact_info, dynamic_contacts)
                platforms_scraped.extend(['instagram', 'twitter', 'youtube', 'bandcamp', 'spotify'])
            
            # Phase 3: Website deep diving
            if contact_info.websites:
                logger.info(f"Phase 3: Website scraping for {artist_name}")
                website_contacts = await self._website_scraping_phase(list(contact_info.websites)[:3])
                contact_info = self._merge_contact_info(contact_info, website_contacts)
                platforms_scraped.extend(['external_websites'])
            
            # Phase 4: AI-powered email classification and validation
            logger.info(f"Phase 4: Contact processing for {artist_name}")
            email_classifications = await self._classify_and_validate_contacts(contact_info)
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence_score(contact_info, email_classifications)
            contact_info.confidence_score = confidence_score
            contact_info.source_platforms = platforms_scraped
            
            scraping_duration = time.time() - start_time
            
            result = ScrapingResult(
                artist_name=artist_name,
                contact_info=contact_info,
                email_classifications=email_classifications,
                scraping_duration=scraping_duration,
                platforms_scraped=platforms_scraped,
                success=True
            )
            
            logger.info(f"Completed hybrid scraping for {artist_name} in {scraping_duration:.2f}s. "
                       f"Found {len(contact_info.emails)} emails, confidence: {confidence_score:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in hybrid scraping for {artist_name}: {str(e)}")
            return ScrapingResult(
                artist_name=artist_name,
                contact_info=ContactInfo(artist_name=artist_name),
                scraping_duration=time.time() - start_time,
                platforms_scraped=platforms_scraped,
                success=False,
                error_message=str(e)
            )
    
    async def _static_scraping_phase(self, artist_name: str) -> ContactInfo:
        """Phase 1: Fast static scraping using BeautifulSoup."""
        contact_info = ContactInfo(artist_name=artist_name)
        
        try:
            # Use existing SoundCloud scraper (BeautifulSoup-based)
            async with SoundCloudScraper() as scraper:
                # This would need to be enhanced to extract contact info
                # For now, it's a placeholder that would extract basic profile data
                artist_profile = await scraper.scrape_artist(artist_name, include_tracks=False)
                
                # Extract any contact information from the profile
                if hasattr(artist_profile, 'description') and artist_profile.description:
                    contact_info.emails.update(self._extract_emails_from_text(artist_profile.description))
                    contact_info.websites.update(self._extract_websites_from_text(artist_profile.description))
                
        except Exception as e:
            logger.warning(f"Static scraping failed for {artist_name}: {str(e)}")
        
        return contact_info
    
    async def _dynamic_scraping_phase(self, artist_name: str, max_platforms: int) -> ContactInfo:
        """Phase 2: Dynamic scraping using Playwright."""
        contact_info = ContactInfo(artist_name=artist_name)
        
        try:
            async with PlaywrightScraper() as scraper:
                dynamic_contacts = await scraper.scrape_artist_contacts(artist_name)
                contact_info = self._merge_contact_info(contact_info, dynamic_contacts)
                
        except Exception as e:
            logger.warning(f"Dynamic scraping failed for {artist_name}: {str(e)}")
        
        return contact_info
    
    async def _website_scraping_phase(self, websites: List[str]) -> ContactInfo:
        """Phase 3: Scrape external websites for additional contact info."""
        contact_info = ContactInfo(artist_name="")
        
        async with PlaywrightScraper() as scraper:
            for website in websites:
                try:
                    website_contacts = await scraper._scrape_website_contacts(website)
                    contact_info = self._merge_contact_info(contact_info, website_contacts)
                except Exception as e:
                    logger.warning(f"Failed to scrape website {website}: {str(e)}")
                    continue
        
        return contact_info
    
    async def _classify_and_validate_contacts(self, contact_info: ContactInfo) -> List[EmailClassification]:
        """Phase 4: Classify and validate email contacts using AI."""
        email_classifications = []
        
        for email in contact_info.emails:
            try:
                # Classify email type
                classification = await self.email_classifier.classify_email(
                    email, 
                    context=contact_info.artist_name
                )
                
                # Validate email
                is_valid, deliverability = await self.contact_validator.validate_email(email)
                classification.is_valid = is_valid
                classification.deliverability_score = deliverability
                
                email_classifications.append(classification)
                
            except Exception as e:
                logger.warning(f"Failed to classify/validate email {email}: {str(e)}")
                # Add basic classification
                email_classifications.append(EmailClassification(
                    email=email,
                    classification="general",
                    confidence=0.5,
                    is_valid=True,
                    deliverability_score=0.5
                ))
        
        return email_classifications
    
    def _calculate_confidence_score(
        self, 
        contact_info: ContactInfo, 
        email_classifications: List[EmailClassification]
    ) -> float:
        """Calculate confidence score based on contact data quality."""
        score = 0.0
        
        # Email quantity and quality (40% of score)
        email_score = min(len(contact_info.emails) * 0.1, 0.4)
        
        # Email classification quality (30% of score)
        if email_classifications:
            classification_score = sum(ec.confidence for ec in email_classifications) / len(email_classifications) * 0.3
        else:
            classification_score = 0.0
        
        # Management/booking contacts (20% of score)
        management_score = 0.1 if contact_info.management_contacts else 0.0
        booking_score = 0.1 if contact_info.booking_contacts else 0.0
        
        # Additional contact methods (10% of score)
        additional_score = 0.0
        if contact_info.phone_numbers:
            additional_score += 0.05
        if len(contact_info.social_handles) >= 2:
            additional_score += 0.05
        
        total_score = email_score + classification_score + management_score + booking_score + additional_score
        return min(total_score, 1.0)
    
    def _merge_contact_info(self, base: ContactInfo, new: ContactInfo) -> ContactInfo:
        """Merge contact information from different sources."""
        base.emails.update(new.emails)
        base.phone_numbers.update(new.phone_numbers)
        base.websites.update(new.websites)
        base.social_handles.update(new.social_handles)
        base.management_contacts.update(new.management_contacts)
        base.booking_contacts.update(new.booking_contacts)
        
        return base
    
    def _extract_emails_from_text(self, text: str) -> set:
        """Extract emails from text using regex."""
        import re
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return set(email.lower() for email in emails)
    
    def _extract_websites_from_text(self, text: str) -> set:
        """Extract websites from text using regex."""
        import re
        url_pattern = r'https?://[^\s<>"]{2,}'
        urls = re.findall(url_pattern, text)
        return set(urls)
    
    def _should_use_playwright(self, use_playwright: bool, current_contacts: ContactInfo) -> bool:
        """
        Intelligent decision on whether to use Playwright based on static scraping results.
        
        Args:
            use_playwright: User preference (None=auto, True=force, False=never)
            current_contacts: Results from static scraping
            
        Returns:
            Boolean indicating whether to use Playwright
        """
        # If explicitly set, respect user preference
        if use_playwright is True:
            logger.info("Playwright forced by user preference")
            return True
        elif use_playwright is False:
            logger.info("Playwright disabled by user preference")
            return False
        
        # Auto-decision logic (use_playwright is None)
        email_count = len(current_contacts.emails)
        has_management = bool(current_contacts.management_contacts)
        has_booking = bool(current_contacts.booking_contacts)
        has_phone = bool(current_contacts.phone_numbers)
        has_social = len(current_contacts.social_handles) >= 2
        
        # Criteria for triggering Playwright (any of these conditions)
        should_trigger = (
            email_count < 2 or                    # Less than 2 emails found
            not (has_management or has_booking) or # No business contacts found
            not has_phone or                      # No phone numbers found
            not has_social                        # Limited social media presence
        )
        
        if should_trigger:
            logger.info(f"Auto-triggering Playwright: emails={email_count}, "
                       f"business_contacts={has_management or has_booking}, "
                       f"phone={has_phone}, social_count={len(current_contacts.social_handles)}")
        else:
            logger.info(f"Skipping Playwright: sufficient data found "
                       f"(emails={email_count}, business_contacts={has_management or has_booking})")
        
        return should_trigger


class BatchContactScraper:
    """
    Batch processor for scraping multiple artists efficiently.
    """
    
    def __init__(self, max_concurrent: int = 3):
        self.hybrid_scraper = HybridContactScraper()
        self.max_concurrent = max_concurrent
        
    async def scrape_multiple_artists(
        self, 
        artist_names: List[str], 
        use_playwright: bool = True
    ) -> List[ScrapingResult]:
        """
        Scrape multiple artists concurrently with rate limiting.
        
        Args:
            artist_names: List of artist names to scrape
            use_playwright: Whether to use Playwright for JavaScript-heavy sites
            
        Returns:
            List of ScrapingResult objects
        """
        logger.info(f"Starting batch scraping for {len(artist_names)} artists")
        
        # Create semaphore for concurrent processing
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def scrape_with_semaphore(artist_name: str) -> ScrapingResult:
            async with semaphore:
                # Add delay between requests to avoid being blocked
                await asyncio.sleep(2)  
                return await self.hybrid_scraper.scrape_artist_contacts(
                    artist_name, 
                    use_playwright=use_playwright
                )
        
        # Execute all scraping tasks concurrently
        tasks = [scrape_with_semaphore(artist) for artist in artist_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results and handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to scrape {artist_names[i]}: {str(result)}")
                processed_results.append(ScrapingResult(
                    artist_name=artist_names[i],
                    contact_info=ContactInfo(artist_name=artist_names[i]),
                    scraping_duration=0.0,
                    platforms_scraped=[],
                    success=False,
                    error_message=str(result)
                ))
            else:
                processed_results.append(result)
        
        logger.info(f"Completed batch scraping. Success rate: "
                   f"{sum(1 for r in processed_results if r.success)}/{len(processed_results)}")
        
        return processed_results