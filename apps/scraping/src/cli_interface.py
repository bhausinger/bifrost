#!/usr/bin/env python3
"""
CLI Interface for SoundCloud Email Scraping
Simple interface for Node.js server communication.
"""

import sys
import json
import logging
from typing import Dict, List
from soundcloud_email_scraper import SoundCloudEmailScraper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def process_scrape_emails(parameters: Dict) -> Dict:
    """Process email scraping request"""
    artist_names = parameters.get('artist_names', [])
    
    if not artist_names:
        return {
            'error': 'No artist names provided',
            'results': []
        }
    
    logger.info(f"Scraping emails for {len(artist_names)} artists")
    
    try:
        scraper = SoundCloudEmailScraper()
        results = scraper.scrape_multiple_artists(artist_names)
        
        # Calculate summary
        with_emails = sum(1 for r in results if r['hasEmail'])
        
        return {
            'results': results,
            'summary': {
                'total': len(results),
                'withEmails': with_emails,
                'withoutEmails': len(results) - with_emails
            }
        }
        
    except Exception as e:
        logger.error(f"Error in email scraping: {e}")
        return {
            'error': str(e),
            'results': []
        }


def main():
    """Main CLI interface"""
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        action = input_data.get('action')
        parameters = input_data.get('parameters', {})
        
        logger.info(f"Processing action: {action}")
        
        if action == 'scrape_emails':
            result = process_scrape_emails(parameters)
            print(json.dumps(result))
        else:
            print(json.dumps({
                'error': f'Unknown action: {action}',
                'results': []
            }))
    
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON input: {e}")
        print(json.dumps({
            'error': 'Invalid JSON input',
            'results': []
        }))
    
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(json.dumps({
            'error': str(e),
            'results': []
        }))


if __name__ == "__main__":
    main()