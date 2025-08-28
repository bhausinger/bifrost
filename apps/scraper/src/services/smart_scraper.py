import asyncio
import time
from typing import List, Optional
from services.hybrid_scraper import HybridContactScraper
from models.schemas import ScrapingResult, ContactInfo
from core.logging import get_logger

logger = get_logger(__name__)


class SmartAutoScraper:
    """
    Simplified interface that automatically handles Playwright decisions and optimization.
    This is the main class users should interact with for seamless scraping.
    """
    
    def __init__(self):
        self.hybrid_scraper = HybridContactScraper()
        
    async def scrape_artist(
        self, 
        artist_name: str,
        aggressive_mode: bool = False
    ) -> ScrapingResult:
        """
        Scrape a single artist with automatic Playwright optimization.
        
        Args:
            artist_name: Name of the artist to scrape
            aggressive_mode: If True, always use Playwright for maximum results
            
        Returns:
            ScrapingResult with comprehensive contact information
        """
        logger.info(f"🎯 Smart scraping: {artist_name}")
        
        playwright_setting = True if aggressive_mode else None  # Auto-decide
        
        result = await self.hybrid_scraper.scrape_artist_contacts(
            artist_name=artist_name,
            use_playwright=playwright_setting,
            max_platforms=6
        )
        
        # Log results summary
        if result.success:
            email_count = len(result.contact_info.emails)
            phone_count = len(result.contact_info.phone_numbers)
            social_count = len(result.contact_info.social_handles)
            
            logger.info(f"✅ {artist_name}: {email_count} emails, {phone_count} phones, "
                       f"{social_count} social handles (confidence: {result.contact_info.confidence_score:.2f})")
        else:
            logger.warning(f"❌ {artist_name}: Scraping failed - {result.error_message}")
        
        return result
    
    async def scrape_artists(
        self, 
        artist_names: List[str],
        aggressive_mode: bool = False,
        max_concurrent: int = 3
    ) -> List[ScrapingResult]:
        """
        Scrape multiple artists with automatic optimization.
        
        Args:
            artist_names: List of artist names to scrape
            aggressive_mode: If True, always use Playwright for maximum results
            max_concurrent: Maximum number of concurrent scraping operations
            
        Returns:
            List of ScrapingResult objects
        """
        logger.info(f"🚀 Smart batch scraping: {len(artist_names)} artists")
        start_time = time.time()
        
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def scrape_with_semaphore(artist_name: str) -> ScrapingResult:
            async with semaphore:
                await asyncio.sleep(0.5)  # Small delay to avoid overwhelming servers
                return await self.scrape_artist(artist_name, aggressive_mode)
        
        # Execute all scraping tasks
        tasks = [scrape_with_semaphore(name) for name in artist_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Exception scraping {artist_names[i]}: {str(result)}")
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
        
        # Summary statistics
        total_time = time.time() - start_time
        successful = sum(1 for r in processed_results if r.success)
        total_emails = sum(len(r.contact_info.emails) for r in processed_results if r.success)
        total_phones = sum(len(r.contact_info.phone_numbers) for r in processed_results if r.success)
        
        logger.info(f"🎉 Batch complete: {successful}/{len(artist_names)} successful, "
                   f"{total_emails} emails, {total_phones} phones in {total_time:.1f}s")
        
        return processed_results
    
    async def quick_email_check(self, artist_name: str) -> dict:
        """
        Quick email discovery focused scrape (fastest option).
        
        Args:
            artist_name: Artist name to check
            
        Returns:
            Dictionary with email results and metadata
        """
        logger.info(f"⚡ Quick email check: {artist_name}")
        
        # Force static-only scraping for speed
        result = await self.hybrid_scraper.scrape_artist_contacts(
            artist_name=artist_name,
            use_playwright=False,  # Disable Playwright for speed
            max_platforms=3  # Limit platforms for speed
        )
        
        return {
            'artist_name': artist_name,
            'emails': list(result.contact_info.emails),
            'success': result.success,
            'duration': result.scraping_duration,
            'has_business_emails': bool(result.contact_info.management_contacts or result.contact_info.booking_contacts),
            'error': result.error_message
        }
    
    async def deep_discovery(self, artist_name: str) -> ScrapingResult:
        """
        Maximum depth contact discovery (most comprehensive, slower).
        
        Args:
            artist_name: Artist name to deeply scrape
            
        Returns:
            ScrapingResult with maximum possible contact information
        """
        logger.info(f"🔬 Deep discovery mode: {artist_name}")
        
        # Force Playwright and maximum platforms
        result = await self.hybrid_scraper.scrape_artist_contacts(
            artist_name=artist_name,
            use_playwright=True,  # Force Playwright
            max_platforms=8  # Maximum platforms
        )
        
        # Add additional processing for deep discovery
        if result.success and result.contact_info.websites:
            logger.info(f"🕸️  Deep diving into {len(result.contact_info.websites)} websites for {artist_name}")
            # The website scraping is already handled in the hybrid scraper
        
        return result
    
    def get_scraping_recommendation(self, artist_names: List[str]) -> dict:
        """
        Get recommendations for optimal scraping strategy.
        
        Args:
            artist_names: List of artist names to analyze
            
        Returns:
            Dictionary with scraping recommendations
        """
        count = len(artist_names)
        
        if count == 1:
            return {
                'recommended_method': 'scrape_artist',
                'aggressive_mode': False,
                'estimated_time': '5-15 seconds',
                'description': 'Single artist with auto-optimization'
            }
        elif count <= 5:
            return {
                'recommended_method': 'scrape_artists',
                'aggressive_mode': False,
                'max_concurrent': 3,
                'estimated_time': f'{count * 8}-{count * 15} seconds',
                'description': 'Small batch with auto-optimization'
            }
        elif count <= 20:
            return {
                'recommended_method': 'scrape_artists',
                'aggressive_mode': False,
                'max_concurrent': 3,
                'estimated_time': f'{int(count * 4)}-{int(count * 8)} minutes',
                'description': 'Medium batch - consider queue system'
            }
        else:
            return {
                'recommended_method': 'batch_queue_system',
                'aggressive_mode': False,
                'estimated_time': f'{int(count * 3.5 / 60)} minutes',
                'description': 'Large batch - use queue system with workers'
            }
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Cleanup if needed
        pass


# Convenience functions for direct use
async def scrape_artist_auto(artist_name: str) -> dict:
    """
    Convenience function for quick artist scraping with automatic optimization.
    
    Returns simplified result dictionary.
    """
    async with SmartAutoScraper() as scraper:
        result = await scraper.scrape_artist(artist_name)
        
        return {
            'artist_name': result.artist_name,
            'success': result.success,
            'emails': list(result.contact_info.emails),
            'phone_numbers': list(result.contact_info.phone_numbers),
            'social_handles': dict(result.contact_info.social_handles),
            'management_contacts': dict(result.contact_info.management_contacts),
            'booking_contacts': dict(result.contact_info.booking_contacts),
            'confidence_score': result.contact_info.confidence_score,
            'platforms_used': result.platforms_scraped,
            'scraping_time': result.scraping_duration,
            'error_message': result.error_message
        }


async def scrape_artists_auto(artist_names: List[str]) -> List[dict]:
    """
    Convenience function for batch artist scraping with automatic optimization.
    
    Returns list of simplified result dictionaries.
    """
    async with SmartAutoScraper() as scraper:
        results = await scraper.scrape_artists(artist_names)
        
        return [
            {
                'artist_name': result.artist_name,
                'success': result.success,
                'emails': list(result.contact_info.emails),
                'phone_numbers': list(result.contact_info.phone_numbers),
                'social_handles': dict(result.contact_info.social_handles),
                'management_contacts': dict(result.contact_info.management_contacts),
                'booking_contacts': dict(result.contact_info.booking_contacts),
                'confidence_score': result.contact_info.confidence_score,
                'platforms_used': result.platforms_scraped,
                'scraping_time': result.scraping_duration,
                'error_message': result.error_message
            }
            for result in results
        ]