import asyncio
import random
from typing import List, Dict, Any, Optional
from playwright.async_api import Page, BrowserContext
import json
import time

from core.logging import get_logger

logger = get_logger(__name__)


class StealthManager:
    """
    Advanced anti-detection and stealth features for web scraping.
    """
    
    def __init__(self):
        self.user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
        ]
        
        self.viewport_sizes = [
            {'width': 1920, 'height': 1080},
            {'width': 1366, 'height': 768},
            {'width': 1440, 'height': 900},
            {'width': 1536, 'height': 864},
            {'width': 1680, 'height': 1050}
        ]
        
        # Rate limiting per domain
        self.domain_delays = {}
        self.last_request_times = {}
        
        # Realistic typing speeds (characters per minute)
        self.typing_speeds = {
            'slow': (120, 180),  # 2-3 chars per second
            'normal': (180, 240),  # 3-4 chars per second  
            'fast': (240, 360)   # 4-6 chars per second
        }
    
    async def setup_stealth_context(self, context: BrowserContext) -> BrowserContext:
        """
        Configure browser context with stealth settings.
        """
        logger.info("Setting up stealth browser context")
        
        # Add stealth scripts to every page
        await context.add_init_script("""
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
        
        // Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        
        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        
        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Cypress ? 'granted' : 'default' }) :
                originalQuery(parameters)
        );
        
        // Remove automation indicators
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        """)
        
        return context
    
    async def setup_stealth_page(self, page: Page) -> Page:
        """
        Configure page with additional stealth settings.
        """
        # Set random viewport
        viewport = random.choice(self.viewport_sizes)
        await page.set_viewport_size(viewport['width'], viewport['height'])
        
        # Set extra headers
        await page.set_extra_http_headers({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        })
        
        # Block unnecessary resources to speed up loading
        await page.route("**/*", self._handle_route)
        
        # Add realistic mouse movements
        await self._add_mouse_movements(page)
        
        return page
    
    async def _handle_route(self, route, request):
        """
        Handle routing to block unnecessary resources.
        """
        resource_type = request.resource_type
        
        # Block images, stylesheets, and other non-essential resources for faster loading
        if resource_type in ['image', 'media', 'font', 'stylesheet']:
            await route.abort()
        # Allow scripts and documents
        elif resource_type in ['script', 'document', 'xhr', 'fetch']:
            await route.continue_()
        else:
            await route.continue_()
    
    async def _add_mouse_movements(self, page: Page):
        """
        Add realistic mouse movement patterns.
        """
        await page.evaluate("""
        // Add random mouse movements
        document.addEventListener('DOMContentLoaded', () => {
            const addRandomMouseMovement = () => {
                const event = new MouseEvent('mousemove', {
                    clientX: Math.random() * window.innerWidth,
                    clientY: Math.random() * window.innerHeight,
                });
                document.dispatchEvent(event);
            };
            
            // Add occasional mouse movements
            setInterval(addRandomMouseMovement, Math.random() * 10000 + 5000);
        });
        """)
    
    async def human_delay(
        self, 
        min_seconds: float = 1.0, 
        max_seconds: float = 3.0,
        domain: Optional[str] = None
    ):
        """
        Add human-like delays with domain-specific rate limiting.
        """
        # Check domain-specific rate limiting
        if domain:
            current_time = time.time()
            domain_delay = self.domain_delays.get(domain, 2.0)
            
            if domain in self.last_request_times:
                time_since_last = current_time - self.last_request_times[domain]
                if time_since_last < domain_delay:
                    additional_delay = domain_delay - time_since_last
                    logger.debug(f"Domain rate limiting: additional {additional_delay:.2f}s delay for {domain}")
                    await asyncio.sleep(additional_delay)
            
            self.last_request_times[domain] = current_time
        
        # Add random human delay
        delay = random.uniform(min_seconds, max_seconds)
        logger.debug(f"Human delay: {delay:.2f}s")
        await asyncio.sleep(delay)
    
    async def type_like_human(
        self, 
        page: Page, 
        selector: str, 
        text: str,
        speed: str = 'normal'
    ):
        """
        Type text with human-like timing and errors.
        """
        element = await page.query_selector(selector)
        if not element:
            raise Exception(f"Element not found: {selector}")
        
        # Clear existing text
        await element.click()
        await page.keyboard.press('Control+A')
        
        # Get typing speed range
        min_speed, max_speed = self.typing_speeds[speed]
        
        # Type each character with realistic timing
        for i, char in enumerate(text):
            # Calculate delay (convert CPM to seconds per character)
            cpm = random.uniform(min_speed, max_speed)
            delay = 60 / cpm
            
            # Add small random variation
            delay += random.uniform(-0.1, 0.1)
            
            # Occasionally add longer pauses (thinking)
            if random.random() < 0.05:  # 5% chance
                delay += random.uniform(0.5, 2.0)
            
            # Occasionally make "typos" and correct them
            if random.random() < 0.02 and i > 0:  # 2% chance
                # Type wrong character
                wrong_char = random.choice('abcdefghijklmnopqrstuvwxyz')
                await page.keyboard.type(wrong_char)
                await asyncio.sleep(delay)
                # Correct it
                await page.keyboard.press('Backspace')
                await asyncio.sleep(delay * 0.5)
            
            # Type the correct character
            await page.keyboard.type(char)
            await asyncio.sleep(delay)
    
    async def scroll_like_human(self, page: Page, target_selector: Optional[str] = None):
        """
        Scroll page naturally like a human would.
        """
        if target_selector:
            # Scroll to specific element
            element = await page.query_selector(target_selector)
            if element:
                await element.scroll_into_view_if_needed()
                await self.human_delay(0.5, 1.5)
        else:
            # Random scrolling
            for _ in range(random.randint(1, 3)):
                scroll_amount = random.randint(200, 800)
                await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
                await self.human_delay(0.8, 2.0)
    
    async def click_like_human(self, page: Page, selector: str):
        """
        Click element with human-like behavior.
        """
        element = await page.query_selector(selector)
        if not element:
            raise Exception(f"Element not found: {selector}")
        
        # Move mouse to element first
        bounding_box = await element.bounding_box()
        if bounding_box:
            # Click at a slightly random position within the element
            x = bounding_box['x'] + bounding_box['width'] * random.uniform(0.2, 0.8)
            y = bounding_box['y'] + bounding_box['height'] * random.uniform(0.2, 0.8)
            
            await page.mouse.move(x, y)
            await self.human_delay(0.1, 0.3)
            await page.mouse.click(x, y)
        else:
            await element.click()
    
    def get_random_user_agent(self) -> str:
        """
        Get a random user agent string.
        """
        return random.choice(self.user_agents)
    
    def get_random_viewport(self) -> Dict[str, int]:
        """
        Get random viewport dimensions.
        """
        return random.choice(self.viewport_sizes)
    
    async def wait_for_page_load(self, page: Page, timeout: int = 30000):
        """
        Wait for page to fully load with multiple strategies.
        """
        try:
            # Wait for network idle
            await page.wait_for_load_state('networkidle', timeout=timeout)
        except:
            try:
                # Fallback: wait for DOM content loaded
                await page.wait_for_load_state('domcontentloaded', timeout=timeout)
            except:
                # Final fallback: just wait for load
                await page.wait_for_load_state('load', timeout=timeout)
    
    def adjust_domain_delay(self, domain: str, success: bool):
        """
        Adjust delay for specific domain based on success/failure.
        """
        current_delay = self.domain_delays.get(domain, 2.0)
        
        if success:
            # Decrease delay slightly if successful
            new_delay = max(current_delay * 0.9, 1.0)
        else:
            # Increase delay if failed (might be getting blocked)
            new_delay = min(current_delay * 1.5, 10.0)
        
        self.domain_delays[domain] = new_delay
        logger.debug(f"Adjusted delay for {domain}: {new_delay:.2f}s")
    
    async def handle_captcha_detection(self, page: Page) -> bool:
        """
        Detect and handle CAPTCHA challenges.
        """
        # Look for common CAPTCHA indicators
        captcha_selectors = [
            '[class*="captcha"]',
            '[id*="captcha"]',
            'iframe[src*="recaptcha"]',
            '[class*="recaptcha"]',
            '[class*="hcaptcha"]'
        ]
        
        for selector in captcha_selectors:
            element = await page.query_selector(selector)
            if element:
                logger.warning(f"CAPTCHA detected on page: {page.url}")
                # Wait longer and return false to indicate manual intervention needed
                await self.human_delay(5, 10)
                return False
        
        return True  # No CAPTCHA detected
    
    async def simulate_human_session(self, page: Page):
        """
        Simulate realistic human browsing session.
        """
        # Random page interactions
        actions = [
            self._simulate_reading,
            self._simulate_scrolling, 
            self._simulate_mouse_movement
        ]
        
        # Perform 1-3 random actions
        num_actions = random.randint(1, 3)
        for _ in range(num_actions):
            action = random.choice(actions)
            try:
                await action(page)
            except Exception as e:
                logger.debug(f"Simulated action failed: {str(e)}")
    
    async def _simulate_reading(self, page: Page):
        """
        Simulate reading time on page.
        """
        read_time = random.uniform(2, 8)
        logger.debug(f"Simulating reading for {read_time:.2f}s")
        await asyncio.sleep(read_time)
    
    async def _simulate_scrolling(self, page: Page):
        """
        Simulate natural scrolling behavior.
        """
        for _ in range(random.randint(2, 5)):
            scroll_amount = random.randint(100, 500)
            direction = random.choice([1, -1])  # Up or down
            await page.evaluate(f"window.scrollBy(0, {scroll_amount * direction})")
            await self.human_delay(0.5, 2.0)
    
    async def _simulate_mouse_movement(self, page: Page):
        """
        Simulate random mouse movements.
        """
        viewport = await page.viewport_size()
        if viewport:
            for _ in range(random.randint(2, 5)):
                x = random.randint(0, viewport['width'])
                y = random.randint(0, viewport['height'])
                await page.mouse.move(x, y)
                await self.human_delay(0.2, 0.8)