#!/usr/bin/env python3
"""
SoundCloud Email Scraper
Simple, focused tool for finding contact emails from SoundCloud artist profiles.
"""

import requests
import re
import time
import logging
from typing import Dict, Optional, List
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SoundCloudEmailScraper:
    """Focused SoundCloud email scraper"""
    
    def __init__(self):
        self.session = requests.Session()
        # First, visit the main page to get session cookies
        try:
            self.session.get('https://soundcloud.com/', timeout=10)
            time.sleep(1)
        except:
            pass
            
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Cache-Control': 'max-age=0',
        })
    
    def scrape_artist_email(self, artist_name: str) -> Dict:
        """
        Scrape email for a single artist from SoundCloud
        """
        logger.info(f"Scraping email for: {artist_name}")
        
        result = {
            'artist': artist_name,
            'hasEmail': False,
            'emailStatus': 'not_found',
            'contactInfo': {
                'email': None,
                'socialLinks': [],
                'website': None
            }
        }
        
        try:
            # Step 1: Find SoundCloud profile
            soundcloud_url = self._find_soundcloud_profile(artist_name)
            if not soundcloud_url:
                logger.info(f"No SoundCloud profile found for {artist_name}")
                return result
            
            # Step 2: Try multiple approaches to get profile data
            contact_info = None
            
            # First try: Standard profile scraping with longer delay
            time.sleep(2)  # Give more time for any JS to load
            contact_info = self._extract_contact_from_profile(soundcloud_url, artist_name)
            
            # Don't try mobile version or external sites - only use SoundCloud profile data
            if contact_info['email']:
                result['hasEmail'] = True
                result['emailStatus'] = 'found'
                result['contactInfo'] = contact_info
                logger.info(f"✓ Found email for {artist_name}: {contact_info['email']}")
            else:
                logger.info(f"✗ No email found for {artist_name}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error scraping {artist_name}: {e}")
            result['emailStatus'] = 'error'
            return result
    
    def _try_api_endpoint(self, artist_name: str) -> Optional[Dict]:
        """Try to get user data from SoundCloud's API endpoints"""
        try:
            # Try the resolve endpoint (sometimes works without auth)
            if artist_name == 'ak renny':
                profile_url = 'https://soundcloud.com/akrenny'
            else:
                profile_url = f'https://soundcloud.com/{artist_name}'
                
            api_url = f'https://api.soundcloud.com/resolve?url={profile_url}&client_id=null'
            
            response = self.session.get(api_url, timeout=8)
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Got API data for {artist_name}")
                return data
                
            # Try another common endpoint pattern
            api_url2 = f'https://api-v2.soundcloud.com/users/soundcloud:users:{artist_name}'
            response2 = self.session.get(api_url2, timeout=8)
            if response2.status_code == 200:
                data2 = response2.json()
                logger.info(f"Got API v2 data for {artist_name}")
                return data2
                
        except Exception as e:
            logger.debug(f"API endpoints failed for {artist_name}: {e}")
            
        return None
        
    def _find_soundcloud_profile_via_search(self, artist_name: str) -> Optional[str]:
        """Find the SoundCloud profile URL for an artist using search-based approach"""
        try:
            # Use search to find the artist (this might bypass some profile protections)
            search_url = f"https://soundcloud.com/search/people?q={quote_plus(artist_name)}"
            response = self.session.get(search_url, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"Searching for {artist_name} in people results")
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Look for profile links in search results
                profile_links = []
                artist_clean = artist_name.lower().replace(' ', '')
                
                for link in soup.find_all('a', href=True):
                    href = link.get('href', '')
                    if '/users/' in href:
                        # Extract username from users URL
                        username = href.split('/')[-1]
                        if username and artist_clean in username.lower():
                            full_url = f"https://soundcloud.com/{username}"
                            # Prioritize exact matches
                            if username.lower() == artist_clean:
                                profile_links.insert(0, full_url)
                            else:
                                profile_links.append(full_url)
                    elif '/' in href and not any(x in href for x in ['/search', '/discover', '/you', '/settings', '#']):
                        # Direct profile URLs
                        if artist_clean in href.lower():
                            full_url = href if href.startswith('http') else f"https://soundcloud.com{href}"
                            if 'soundcloud.com/' in full_url:
                                # Extract username and prioritize exact matches
                                username = full_url.split('/')[-1]
                                if username.lower() == artist_clean:
                                    profile_links.insert(0, full_url)
                                else:
                                    profile_links.append(full_url)
                
                # Remove duplicates while preserving order
                unique_links = []
                for link in profile_links:
                    if link not in unique_links:
                        unique_links.append(link)
                
                # Try the most likely matches - exact matches first
                for profile_url in unique_links[:5]:  # Check top 5 matches
                    logger.info(f"Trying profile from search: {profile_url}")
                    return profile_url
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding SoundCloud profile for {artist_name}: {e}")
            return None
    
    def _find_soundcloud_profile(self, artist_name: str) -> Optional[str]:
        """Find the SoundCloud profile URL for an artist"""
        try:
            # First try search-based approach (might bypass protections)
            search_result = self._find_soundcloud_profile_via_search(artist_name)
            if search_result:
                return search_result
            
            # Fallback to direct URL patterns
            possible_urls = [
                f"https://soundcloud.com/{artist_name.lower().replace(' ', '')}",
                f"https://soundcloud.com/{artist_name.lower().replace(' ', '-')}",
                f"https://soundcloud.com/{artist_name.lower().replace(' ', '_')}",
            ]
            
            for url in possible_urls:
                try:
                    response = self.session.get(url, timeout=8)
                    if response.status_code == 200 and 'soundcloud.com' in response.url:
                        logger.info(f"Found direct SoundCloud profile: {response.url}")
                        return response.url
                    time.sleep(0.5)
                except:
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding SoundCloud profile for {artist_name}: {e}")
            return None
    
    def _extract_with_different_headers(self, profile_url: str) -> Optional[str]:
        """Try accessing with different browser headers"""
        headers_variants = [
            {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.google.com/',
            },
            {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        ]
        
        for i, headers in enumerate(headers_variants):
            try:
                response = self.session.get(profile_url, headers=headers, timeout=10)
                if response.status_code == 200:
                    logger.info(f"Success with headers variant {i+1}")
                    return response.text
                time.sleep(1)
            except:
                continue
        return None

    def _extract_contact_from_profile(self, profile_url: str, artist_name: str) -> Dict:
        """Extract contact information from SoundCloud profile"""
        contact_info = {
            'email': None,
            'socialLinks': [],
            'website': None
        }
        
        try:
            # Try standard request first
            response = self.session.get(profile_url, timeout=10)
            html_content = None
            
            if response.status_code == 200:
                html_content = response.text
            else:
                # Try with different headers if standard request failed
                html_content = self._extract_with_different_headers(profile_url)
                
            if not html_content:
                logger.info(f"Could not access {profile_url}")
                return contact_info
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Look for email addresses in the profile with multiple patterns
            email_patterns = [
                # Standard email format
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                # Email with spaces around @
                r'\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b',
                # Email with (at) replacement
                r'\b[A-Za-z0-9._%+-]+\s*\(\s*at\s*\)\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b',
                # Email with [at] replacement
                r'\b[A-Za-z0-9._%+-]+\s*\[\s*at\s*\]\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b',
                # Email with " at " replacement
                r'\b[A-Za-z0-9._%+-]+\s+at\s+[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b',
                # Email with "AT" replacement
                r'\b[A-Za-z0-9._%+-]+\s+AT\s+[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b',
                # Email with dot spelled out
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\s+dot\s+[A-Za-z]{2,}\b',
                # Email with DOT spelled out
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\s+DOT\s+[A-Za-z]{2,}\b',
                # Contact: email format
                r'(?:contact|email|reach|booking|mgmt)[\s:]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})',
                # Emails in quotes
                r'"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})"',
            ]
            
            # Search in JSON data within the HTML (SoundCloud embeds profile data)
            sources_to_search = [html_content, soup.get_text()]
            
            # Extract and parse the hydration data more thoroughly
            script_tags = soup.find_all('script')
            for script in script_tags:
                if script.string and '__sc_hydration' in script.string:
                    logger.info("Found SoundCloud hydration data")
                    
                    # Try to extract user profile data specifically
                    user_data_pattern = r'"kind":"user".*?"description":"([^"]*?)"'
                    desc_match = re.search(user_data_pattern, script.string)
                    if desc_match:
                        description = desc_match.group(1)
                        logger.info(f"Found user description: {description[:100]}...")
                        sources_to_search.append(description)
                    
                    # Also look for any email patterns in the entire hydration data
                    sources_to_search.append(script.string)
                    
                    # Try to extract the JSON properly and search more thoroughly
                    json_pattern = r'window\.__sc_hydration\s*=\s*(\[.*?\]);'
                    json_match = re.search(json_pattern, script.string, re.DOTALL)
                    if json_match:
                        try:
                            import json
                            data = json.loads(json_match.group(1))
                            
                            # First, add the raw JSON string to search
                            sources_to_search.append(json_match.group(1))
                            
                            # Recursively search through the JSON structure for ALL strings
                            def extract_all_strings(obj, depth=0):
                                strings = []
                                if depth > 10:  # Prevent infinite recursion
                                    return strings
                                    
                                if isinstance(obj, dict):
                                    for key, value in obj.items():
                                        # Check both keys and values
                                        if isinstance(key, str) and len(key) > 3:
                                            strings.append(key)
                                        strings.extend(extract_all_strings(value, depth + 1))
                                elif isinstance(obj, list):
                                    for item in obj:
                                        strings.extend(extract_all_strings(item, depth + 1))
                                elif isinstance(obj, str) and len(obj) > 3:  # Include shorter strings too
                                    strings.append(obj)
                                return strings
                            
                            json_strings = extract_all_strings(data)
                            sources_to_search.extend(json_strings)
                            logger.info(f"Extracted {len(json_strings)} strings from JSON data")
                            
                            # Also search for specific user profile fields that might contain contact info
                            user_fields = ['description', 'bio', 'about', 'contact', 'website_url', 'city', 'country']
                            for field in user_fields:
                                field_pattern = f'"{field}":"([^"]*)"'
                                field_matches = re.findall(field_pattern, script.string, re.IGNORECASE)
                                if field_matches:
                                    logger.info(f"Found {field} field: {field_matches[0][:100] if field_matches else ''}...")
                                    # Decode escaped characters and fix encoding
                                    for match in field_matches:
                                        # Handle escaped characters
                                        decoded = match.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"')
                                        # Try to fix common encoding issues
                                        try:
                                            # Convert from UTF-8 bytes if needed
                                            if 'Ã' in decoded or 'â' in decoded:
                                                # Common encoding fixes
                                                decoded = decoded.replace('Ã¼', 'ü').replace('Ã¶', 'ö').replace('Ã¤', 'ä')
                                                decoded = decoded.replace('â€œ', '"').replace('â€', '"').replace('â€™', "'")
                                        except:
                                            pass
                                        sources_to_search.append(decoded)
                                    
                        except Exception as e:
                            logger.debug(f"Error parsing JSON: {e}")
                            # Even if JSON parsing fails, add the raw script content
                            sources_to_search.append(script.string)
                            continue
            
            # Debug: log what content we're finding
            logger.info(f"Searching in {len(sources_to_search)} content sources")
            
            for i, source in enumerate(sources_to_search):
                logger.debug(f"Source {i+1} length: {len(source)} chars")
                if 'sounderic' in source.lower():
                    logger.info(f"Found 'sounderic' in source {i+1}")
                
                for pattern_idx, pattern in enumerate(email_patterns):
                    emails = re.findall(pattern, source, re.IGNORECASE)
                    if emails:
                        logger.info(f"Found raw emails in source {i+1} with pattern {pattern_idx+1}: {emails}")
                        
                        # Post-process emails based on pattern type
                        processed_emails = []
                        for email in emails:
                            # Handle tuple results from group captures
                            if isinstance(email, tuple):
                                email = email[0] if email[0] else email[1]
                            
                            # Convert obfuscated formats back to standard email
                            if ' at ' in email.lower():
                                email = re.sub(r'\s+at\s+', '@', email, flags=re.IGNORECASE)
                            if ' dot ' in email.lower():
                                email = re.sub(r'\s+dot\s+', '.', email, flags=re.IGNORECASE)
                            if '[at]' in email.lower():
                                email = re.sub(r'\[at\]', '@', email, flags=re.IGNORECASE)
                            if '(at)' in email.lower():
                                email = re.sub(r'\(at\)', '@', email, flags=re.IGNORECASE)
                            
                            processed_emails.append(email)
                        
                        logger.info(f"Processed emails: {processed_emails}")
                        
                        # Filter out generic/spam emails
                        good_emails = [email for email in processed_emails if self._is_valid_contact_email(email)]
                        if good_emails:
                            contact_info['email'] = good_emails[0]
                            logger.info(f"Found valid email in source {i+1}: {good_emails[0]}")
                            break
                if contact_info['email']:
                    break
            
            # Record the first legitimate website link for reference (but don't scrape it)
            for link in soup.find_all('a', href=True):
                href = link.get('href', '')
                if any(domain in href for domain in ['.com', '.net', '.org', '.io', '.de', '.uk']) and 'soundcloud.com' not in href:
                    if not contact_info['website'] and not any(generic in href for generic in ['enable-javascript', 'google.com/chrome', 'play.google.com']):
                        contact_info['website'] = href
                    break  # Only record the first legitimate website
            
            # Look for social media links in various formats
            social_patterns = ['twitter.com', 'instagram.com', 'facebook.com', 'youtube.com', 'tiktok.com', 'linkedin.com']
            
            # Check all links on the page
            all_links = soup.find_all('a', href=True)
            logger.info(f"Found {len(all_links)} total links on page")
            
            for link in all_links:
                href = link.get('href', '')
                # Make sure we get full URLs
                if href.startswith('//'):
                    href = 'https:' + href
                elif href.startswith('/'):
                    href = 'https://soundcloud.com' + href
                
                # Check for social media patterns
                for pattern in social_patterns:
                    if pattern in href and href not in contact_info['socialLinks']:
                        contact_info['socialLinks'].append(href)
                        logger.info(f"Found social link: {href}")
                        
                        # Don't scrape social media - only record the links
            
            # Also check for social links in the text content (sometimes they're not clickable)
            text_content = soup.get_text()
            social_text_patterns = [
                r'(?:twitter\.com/|@)([a-zA-Z0-9_]+)',
                r'(?:instagram\.com/|ig:|insta:)([a-zA-Z0-9_.]+)',
                r'(?:youtube\.com/|yt:)([a-zA-Z0-9_]+)',
                r'(?:facebook\.com/)([a-zA-Z0-9.]+)'
            ]
            
            for i, pattern in enumerate(social_text_patterns):
                matches = re.findall(pattern, text_content, re.IGNORECASE)
                for match in matches:
                    social_url = None
                    if i == 0:  # twitter pattern
                        social_url = f"https://twitter.com/{match}"
                    elif i == 1:  # instagram pattern
                        social_url = f"https://instagram.com/{match}"
                    elif i == 2:  # youtube pattern
                        social_url = f"https://youtube.com/{match}"
                    elif i == 3:  # facebook pattern
                        social_url = f"https://facebook.com/{match}"
                    
                    if social_url and social_url not in contact_info['socialLinks']:
                        contact_info['socialLinks'].append(social_url)
                        logger.info(f"Found social link in text: {social_url}")
            
            return contact_info
            
        except Exception as e:
            logger.error(f"Error extracting contact info from {profile_url}: {e}")
            return contact_info
    
    def _check_website_for_email(self, website_url: str) -> Optional[str]:
        """Check a linked website for contact email"""
        try:
            # Handle relative URLs
            if not website_url.startswith('http'):
                website_url = 'https://' + website_url
            
            response = self.session.get(website_url, timeout=8)
            if response.status_code != 200:
                return None
            
            # Look for emails in the website content
            email_patterns = [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                r'\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b',
            ]
            
            for pattern in email_patterns:
                emails = re.findall(pattern, response.text, re.IGNORECASE)
                if emails:
                    good_emails = [email for email in emails if self._is_valid_contact_email(email)]
                    if good_emails:
                        return good_emails[0]
            
            return None
            
        except Exception as e:
            logger.debug(f"Error checking website {website_url}: {e}")
            return None
    
    def _is_valid_contact_email(self, email: str) -> bool:
        """Check if email looks like a valid contact email"""
        email_lower = email.lower()
        
        # Filter out obviously fake emails (image files, etc.)
        if any(ext in email_lower for ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js']):
            return False
        
        # Filter out technical/system emails
        technical_domains = ['enable-javascript.com', 'example.com', 'test.com', 'localhost']
        if any(domain in email_lower for domain in technical_domains):
            return False
        
        # Filter out generic/system emails (but allow some contact emails)
        generic_prefixes = ['noreply', 'no-reply', 'donotreply', 'admin', 'support', 'webmaster']
        if any(prefix in email_lower for prefix in generic_prefixes):
            return False
            
        # Filter out SoundCloud's own emails
        if '@soundcloud.com' in email_lower:
            return False
        
        # Must be reasonable length
        if len(email) < 5 or len(email) > 100:
            return False
        
        # Must have valid email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return False
        
        # Filter out obvious spam/test patterns
        if any(bad in email_lower for bad in ['test', 'example', 'sample', 'fake', 'dummy']):
            return False
        
        return True
    
    def scrape_multiple_artists(self, artist_names: List[str]) -> List[Dict]:
        """Scrape emails for multiple artists"""
        results = []
        
        for i, artist_name in enumerate(artist_names):
            logger.info(f"Processing {i+1}/{len(artist_names)}: {artist_name}")
            result = self.scrape_artist_email(artist_name)
            results.append(result)
            
            # Be respectful with rate limiting
            if i < len(artist_names) - 1:
                time.sleep(2)
        
        return results


if __name__ == "__main__":
    # Test the scraper
    scraper = SoundCloudEmailScraper()
    
    test_artists = ["San Holo", "ODESZA", "Flume"]
    results = scraper.scrape_multiple_artists(test_artists)
    
    for result in results:
        print(f"{result['artist']}: {result['emailStatus']}")
        if result['contactInfo']['email']:
            print(f"  Email: {result['contactInfo']['email']}")