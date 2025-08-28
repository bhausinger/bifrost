import asyncio
import csv
import json
import io
from typing import List, Dict, Any, Optional
from datetime import datetime
import aiofiles

from models.schemas import ContactInfo, ScrapingResult, EmailClassification
from core.logging import get_logger

logger = get_logger(__name__)


class ContactEnricher:
    """
    Service for enriching and enhancing contact data with additional information.
    """
    
    def __init__(self):
        self.enrichment_cache = {}
        
    async def enrich_contact_info(self, contact_info: ContactInfo) -> ContactInfo:
        """
        Enrich contact information with additional data and insights.
        
        Args:
            contact_info: Basic contact information
            
        Returns:
            Enhanced contact information
        """
        logger.info(f"Enriching contact info for {contact_info.artist_name}")
        
        # Create enhanced copy
        enriched = ContactInfo(**contact_info.dict())
        
        # Add timestamp
        enriched.last_updated = datetime.now()
        
        # Enrich emails with domain analysis
        enriched.emails = await self._enrich_emails(list(contact_info.emails))
        
        # Enhance social handles with platform insights
        enriched.social_handles = await self._enrich_social_handles(contact_info.social_handles)
        
        # Add contact scoring
        enriched.confidence_score = self._calculate_enhanced_confidence_score(enriched)
        
        # Generate contact insights
        enriched.contact_insights = await self._generate_contact_insights(enriched)
        
        logger.info(f"Contact enrichment completed for {contact_info.artist_name}")
        return enriched
    
    async def _enrich_emails(self, emails: List[str]) -> List[Dict[str, Any]]:
        """
        Enrich email addresses with domain and deliverability information.
        """
        enriched_emails = []
        
        for email in emails:
            domain = email.split('@')[1] if '@' in email else ''
            
            email_info = {
                'email': email,
                'domain': domain,
                'domain_type': self._classify_domain_type(domain),
                'business_likelihood': self._calculate_business_likelihood(email),
                'professional_score': self._calculate_professional_score(email),
                'contact_type_hints': self._extract_contact_type_hints(email)
            }
            
            enriched_emails.append(email_info)
        
        return enriched_emails
    
    async def _enrich_social_handles(self, social_handles: Dict[str, str]) -> Dict[str, Dict[str, Any]]:
        """
        Enrich social media handles with platform-specific insights.
        """
        enriched_handles = {}
        
        for platform, url in social_handles.items():
            handle_info = {
                'url': url,
                'platform': platform,
                'handle': self._extract_handle_from_url(url),
                'verification_likelihood': self._estimate_verification_likelihood(platform, url),
                'engagement_potential': self._estimate_engagement_potential(platform),
                'contact_discovery_potential': self._estimate_contact_potential(platform)
            }
            
            enriched_handles[platform] = handle_info
        
        return enriched_handles
    
    def _classify_domain_type(self, domain: str) -> str:
        """
        Classify email domain type.
        """
        personal_domains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'icloud.com', 'aol.com', 'protonmail.com'
        ]
        
        music_domains = [
            'soundcloud.com', 'spotify.com', 'bandcamp.com',
            'musicgateway.com', 'reverbnation.com'
        ]
        
        if domain in personal_domains:
            return 'personal'
        elif domain in music_domains:
            return 'music_platform'
        elif any(keyword in domain for keyword in ['music', 'records', 'label', 'management']):
            return 'music_business'
        else:
            return 'business'
    
    def _calculate_business_likelihood(self, email: str) -> float:
        """
        Calculate likelihood that email is business-related.
        """
        local_part = email.split('@')[0].lower()
        domain = email.split('@')[1].lower()
        
        score = 0.5  # Base score
        
        # Business keywords in local part
        business_keywords = [
            'info', 'contact', 'business', 'booking', 'management',
            'manager', 'agent', 'press', 'media', 'admin'
        ]
        
        for keyword in business_keywords:
            if keyword in local_part:
                score += 0.2
        
        # Personal indicators
        personal_indicators = ['personal', 'private', 'me', 'my']
        for indicator in personal_indicators:
            if indicator in local_part:
                score -= 0.3
        
        # Domain type adjustment
        if self._classify_domain_type(domain) == 'business':
            score += 0.2
        elif self._classify_domain_type(domain) == 'personal':
            score -= 0.1
        
        return max(0.0, min(1.0, score))
    
    def _calculate_professional_score(self, email: str) -> float:
        """
        Calculate professional appearance score of email.
        """
        local_part = email.split('@')[0].lower()
        
        score = 0.5  # Base score
        
        # Professional patterns
        if '.' in local_part:  # firstname.lastname
            score += 0.3
        
        if any(char.isdigit() for char in local_part):
            if local_part[-4:].isdigit():  # Likely birth year
                score += 0.1
            else:
                score -= 0.1  # Random numbers less professional
        
        # Length consideration
        if 5 <= len(local_part) <= 20:
            score += 0.1
        else:
            score -= 0.1
        
        return max(0.0, min(1.0, score))
    
    def _extract_contact_type_hints(self, email: str) -> List[str]:
        """
        Extract hints about contact type from email.
        """
        local_part = email.split('@')[0].lower()
        hints = []
        
        type_keywords = {
            'booking': ['book', 'booking', 'shows', 'gigs', 'tour'],
            'management': ['manager', 'mgmt', 'management', 'agent'],
            'press': ['press', 'pr', 'media', 'publicity'],
            'business': ['business', 'contact', 'info', 'admin'],
            'personal': ['personal', 'private', 'me', 'my']
        }
        
        for contact_type, keywords in type_keywords.items():
            if any(keyword in local_part for keyword in keywords):
                hints.append(contact_type)
        
        return hints
    
    def _extract_handle_from_url(self, url: str) -> str:
        """
        Extract username/handle from social media URL.
        """
        # Simple extraction - could be enhanced
        parts = url.rstrip('/').split('/')
        return parts[-1] if parts else ''
    
    def _estimate_verification_likelihood(self, platform: str, url: str) -> float:
        """
        Estimate likelihood that social media account is verified.
        """
        # This is a placeholder - in reality, you'd check the actual page
        base_likelihood = {
            'instagram': 0.3,
            'twitter': 0.25,
            'youtube': 0.4,
            'facebook': 0.35,
            'tiktok': 0.2
        }
        
        return base_likelihood.get(platform, 0.2)
    
    def _estimate_engagement_potential(self, platform: str) -> float:
        """
        Estimate engagement potential for different platforms.
        """
        engagement_scores = {
            'instagram': 0.8,
            'tiktok': 0.9,
            'twitter': 0.7,
            'youtube': 0.6,
            'facebook': 0.5,
            'linkedin': 0.4
        }
        
        return engagement_scores.get(platform, 0.5)
    
    def _estimate_contact_potential(self, platform: str) -> float:
        """
        Estimate likelihood of finding additional contact info on platform.
        """
        contact_potential = {
            'instagram': 0.7,  # Bio links, contact buttons
            'youtube': 0.6,   # About section, descriptions
            'twitter': 0.5,   # Bio, pinned tweets
            'facebook': 0.4,  # About section
            'linkedin': 0.8,  # Professional info
            'tiktok': 0.3     # Limited contact options
        }
        
        return contact_potential.get(platform, 0.3)
    
    def _calculate_enhanced_confidence_score(self, contact_info: ContactInfo) -> float:
        """
        Calculate enhanced confidence score based on enriched data.
        """
        score = 0.0
        
        # Email quality (40% of score)
        if hasattr(contact_info, 'emails') and contact_info.emails:
            email_scores = []
            for email_info in contact_info.emails:
                if isinstance(email_info, dict):
                    email_score = (
                        email_info.get('business_likelihood', 0.5) * 0.6 +
                        email_info.get('professional_score', 0.5) * 0.4
                    )
                    email_scores.append(email_score)
            
            if email_scores:
                avg_email_score = sum(email_scores) / len(email_scores)
                score += avg_email_score * 0.4
        
        # Contact diversity (30% of score)
        contact_types = set()
        if hasattr(contact_info, 'management_contacts'):
            contact_types.update(contact_info.management_contacts.keys())
        if hasattr(contact_info, 'booking_contacts'):
            contact_types.update(contact_info.booking_contacts.keys())
        
        diversity_score = min(len(contact_types) * 0.15, 0.3)
        score += diversity_score
        
        # Social media presence (20% of score)
        if hasattr(contact_info, 'social_handles') and contact_info.social_handles:
            social_score = min(len(contact_info.social_handles) * 0.05, 0.2)
            score += social_score
        
        # Additional contact methods (10% of score)
        additional_score = 0.0
        if hasattr(contact_info, 'phone_numbers') and contact_info.phone_numbers:
            additional_score += 0.05
        if hasattr(contact_info, 'websites') and contact_info.websites:
            additional_score += 0.05
        
        score += additional_score
        
        return min(score, 1.0)
    
    async def _generate_contact_insights(self, contact_info: ContactInfo) -> Dict[str, Any]:
        """
        Generate actionable insights about the contact information.
        """
        insights = {
            'recommendations': [],
            'contact_strategy': '',
            'best_contact_methods': [],
            'data_quality': 'unknown',
            'follow_up_suggestions': []
        }
        
        # Analyze available contact methods
        contact_methods = []
        
        if hasattr(contact_info, 'management_contacts') and contact_info.management_contacts:
            contact_methods.append('management')
            insights['recommendations'].append('Management contacts available - reach out for bookings')
        
        if hasattr(contact_info, 'booking_contacts') and contact_info.booking_contacts:
            contact_methods.append('booking')
            insights['recommendations'].append('Direct booking contacts found - ideal for show offers')
        
        if hasattr(contact_info, 'emails') and contact_info.emails:
            business_emails = []
            personal_emails = []
            
            for email_info in contact_info.emails:
                if isinstance(email_info, dict):
                    if email_info.get('business_likelihood', 0) > 0.7:
                        business_emails.append(email_info['email'])
                    else:
                        personal_emails.append(email_info['email'])
                else:
                    personal_emails.append(str(email_info))
            
            if business_emails:
                insights['best_contact_methods'].extend(business_emails)
                insights['contact_strategy'] = 'professional_outreach'
            elif personal_emails:
                insights['best_contact_methods'].extend(personal_emails[:2])  # Limit to 2
                insights['contact_strategy'] = 'personal_outreach'
        
        # Data quality assessment
        total_contacts = (
            len(getattr(contact_info, 'emails', [])) +
            len(getattr(contact_info, 'phone_numbers', [])) +
            len(getattr(contact_info, 'social_handles', []))
        )
        
        if total_contacts >= 3:
            insights['data_quality'] = 'excellent'
        elif total_contacts >= 2:
            insights['data_quality'] = 'good'
        elif total_contacts >= 1:
            insights['data_quality'] = 'fair'
        else:
            insights['data_quality'] = 'poor'
        
        # Follow-up suggestions
        if hasattr(contact_info, 'social_handles') and contact_info.social_handles:
            if 'instagram' in contact_info.social_handles:
                insights['follow_up_suggestions'].append('Check Instagram for additional contact info in bio')
            if 'youtube' in contact_info.social_handles:
                insights['follow_up_suggestions'].append('Review YouTube About section for management details')
        
        if hasattr(contact_info, 'websites') and contact_info.websites:
            insights['follow_up_suggestions'].append('Visit artist websites for additional contact pages')
        
        return insights


class ContactExporter:
    """
    Export contact data to various formats for CRM integration and outreach.
    """
    
    async def export_to_csv(
        self, 
        scraping_results: List[ScrapingResult], 
        include_classifications: bool = True
    ) -> str:
        """
        Export scraping results to CSV format.
        
        Returns:
            CSV content as string
        """
        output = io.StringIO()
        
        # Define CSV headers
        headers = [
            'artist_name', 'confidence_score', 'platforms_scraped',
            'emails', 'phone_numbers', 'websites', 'social_handles',
            'management_contacts', 'booking_contacts', 'scraping_success'
        ]
        
        if include_classifications:
            headers.extend(['email_classifications', 'contact_insights'])
        
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for result in scraping_results:
            row_data = {
                'artist_name': result.artist_name,
                'confidence_score': getattr(result.contact_info, 'confidence_score', 0.0),
                'platforms_scraped': '; '.join(result.platforms_scraped),
                'emails': '; '.join(map(str, getattr(result.contact_info, 'emails', []))),
                'phone_numbers': '; '.join(map(str, getattr(result.contact_info, 'phone_numbers', []))),
                'websites': '; '.join(map(str, getattr(result.contact_info, 'websites', []))),
                'social_handles': self._format_social_handles(
                    getattr(result.contact_info, 'social_handles', {})
                ),
                'management_contacts': self._format_contacts(
                    getattr(result.contact_info, 'management_contacts', {})
                ),
                'booking_contacts': self._format_contacts(
                    getattr(result.contact_info, 'booking_contacts', {})
                ),
                'scraping_success': result.success
            }
            
            if include_classifications:
                row_data['email_classifications'] = self._format_email_classifications(
                    result.email_classifications
                )
                row_data['contact_insights'] = self._format_insights(
                    getattr(result.contact_info, 'contact_insights', {})
                )
            
            writer.writerow(row_data)
        
        return output.getvalue()
    
    async def export_to_json(self, scraping_results: List[ScrapingResult]) -> str:
        """
        Export scraping results to JSON format.
        
        Returns:
            JSON content as string
        """
        export_data = {
            'exported_at': datetime.now().isoformat(),
            'total_artists': len(scraping_results),
            'successful_scrapes': sum(1 for r in scraping_results if r.success),
            'results': []
        }
        
        for result in scraping_results:
            result_data = {
                'artist_name': result.artist_name,
                'success': result.success,
                'scraping_duration': result.scraping_duration,
                'platforms_scraped': result.platforms_scraped,
                'contact_info': self._serialize_contact_info(result.contact_info),
                'email_classifications': [
                    self._serialize_email_classification(ec) 
                    for ec in result.email_classifications
                ],
                'error_message': result.error_message
            }
            
            export_data['results'].append(result_data)
        
        return json.dumps(export_data, indent=2, default=str)
    
    async def export_for_crm(
        self, 
        scraping_results: List[ScrapingResult],
        crm_format: str = 'hubspot'
    ) -> str:
        """
        Export data in CRM-specific format.
        
        Args:
            scraping_results: Results to export
            crm_format: Target CRM format (hubspot, salesforce, etc.)
            
        Returns:
            CRM-formatted data as string
        """
        if crm_format.lower() == 'hubspot':
            return await self._export_hubspot_format(scraping_results)
        elif crm_format.lower() == 'salesforce':
            return await self._export_salesforce_format(scraping_results)
        else:
            # Default to generic CSV
            return await self.export_to_csv(scraping_results)
    
    async def _export_hubspot_format(self, scraping_results: List[ScrapingResult]) -> str:
        """Export in HubSpot-compatible CSV format."""
        output = io.StringIO()
        
        headers = [
            'First Name', 'Last Name', 'Email', 'Company', 'Phone Number',
            'Website', 'LinkedIn URL', 'Twitter URL', 'Instagram URL',
            'Lead Source', 'Lead Status', 'Notes'
        ]
        
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for result in scraping_results:
            if not result.success:
                continue
                
            # Extract primary email
            emails = getattr(result.contact_info, 'emails', [])
            primary_email = emails[0] if emails else ''
            
            # Extract social handles
            social_handles = getattr(result.contact_info, 'social_handles', {})
            
            row_data = {
                'First Name': result.artist_name.split()[0] if result.artist_name else '',
                'Last Name': ' '.join(result.artist_name.split()[1:]) if len(result.artist_name.split()) > 1 else '',
                'Email': str(primary_email) if primary_email else '',
                'Company': result.artist_name,
                'Phone Number': '; '.join(map(str, getattr(result.contact_info, 'phone_numbers', []))),
                'Website': '; '.join(map(str, getattr(result.contact_info, 'websites', []))),
                'LinkedIn URL': social_handles.get('linkedin', ''),
                'Twitter URL': social_handles.get('twitter', ''),
                'Instagram URL': social_handles.get('instagram', ''),
                'Lead Source': 'AI Web Scraping',
                'Lead Status': 'New',
                'Notes': f"Scraped from {', '.join(result.platforms_scraped)}. "
                        f"Confidence: {getattr(result.contact_info, 'confidence_score', 0):.2f}"
            }
            
            writer.writerow(row_data)
        
        return output.getvalue()
    
    async def _export_salesforce_format(self, scraping_results: List[ScrapingResult]) -> str:
        """Export in Salesforce-compatible CSV format."""
        output = io.StringIO()
        
        headers = [
            'FirstName', 'LastName', 'Email', 'Company', 'Phone', 'Website',
            'LeadSource', 'Status', 'Description'
        ]
        
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for result in scraping_results:
            if not result.success:
                continue
                
            emails = getattr(result.contact_info, 'emails', [])
            primary_email = emails[0] if emails else ''
            
            row_data = {
                'FirstName': result.artist_name.split()[0] if result.artist_name else '',
                'LastName': ' '.join(result.artist_name.split()[1:]) if len(result.artist_name.split()) > 1 else '',
                'Email': str(primary_email) if primary_email else '',
                'Company': result.artist_name,
                'Phone': '; '.join(map(str, getattr(result.contact_info, 'phone_numbers', []))),
                'Website': '; '.join(map(str, getattr(result.contact_info, 'websites', []))),
                'LeadSource': 'Web Scraping',
                'Status': 'Open - Not Contacted',
                'Description': f"Artist contact discovered via AI scraping. "
                              f"Platforms: {', '.join(result.platforms_scraped)}"
            }
            
            writer.writerow(row_data)
        
        return output.getvalue()
    
    def _format_social_handles(self, social_handles: Dict[str, Any]) -> str:
        """Format social handles for CSV export."""
        if not social_handles:
            return ''
        
        formatted = []
        for platform, info in social_handles.items():
            if isinstance(info, dict):
                url = info.get('url', str(info))
            else:
                url = str(info)
            formatted.append(f"{platform}: {url}")
        
        return '; '.join(formatted)
    
    def _format_contacts(self, contacts: Dict[str, str]) -> str:
        """Format contact dictionary for CSV export."""
        if not contacts:
            return ''
        
        return '; '.join(f"{k}: {v}" for k, v in contacts.items())
    
    def _format_email_classifications(self, classifications: List[EmailClassification]) -> str:
        """Format email classifications for CSV export."""
        if not classifications:
            return ''
        
        formatted = []
        for ec in classifications:
            if hasattr(ec, 'email'):
                formatted.append(f"{ec.email} ({ec.classification})")
            else:
                formatted.append(str(ec))
        
        return '; '.join(formatted)
    
    def _format_insights(self, insights: Dict[str, Any]) -> str:
        """Format contact insights for CSV export."""
        if not insights:
            return ''
        
        summary = []
        if 'data_quality' in insights:
            summary.append(f"Quality: {insights['data_quality']}")
        if 'contact_strategy' in insights:
            summary.append(f"Strategy: {insights['contact_strategy']}")
        if 'recommendations' in insights:
            summary.append(f"Recommendations: {'; '.join(insights['recommendations'][:2])}")
        
        return ' | '.join(summary)
    
    def _serialize_contact_info(self, contact_info: ContactInfo) -> Dict[str, Any]:
        """Serialize contact info for JSON export."""
        return {
            'artist_name': contact_info.artist_name,
            'emails': list(getattr(contact_info, 'emails', [])),
            'phone_numbers': list(getattr(contact_info, 'phone_numbers', [])),
            'websites': list(getattr(contact_info, 'websites', [])),
            'social_handles': getattr(contact_info, 'social_handles', {}),
            'management_contacts': getattr(contact_info, 'management_contacts', {}),
            'booking_contacts': getattr(contact_info, 'booking_contacts', {}),
            'confidence_score': getattr(contact_info, 'confidence_score', 0.0),
            'source_platforms': getattr(contact_info, 'source_platforms', []),
            'contact_insights': getattr(contact_info, 'contact_insights', {})
        }
    
    def _serialize_email_classification(self, classification: EmailClassification) -> Dict[str, Any]:
        """Serialize email classification for JSON export."""
        if hasattr(classification, 'dict'):
            return classification.dict()
        else:
            return {
                'email': getattr(classification, 'email', ''),
                'classification': getattr(classification, 'classification', 'unknown'),
                'confidence': getattr(classification, 'confidence', 0.0),
                'is_valid': getattr(classification, 'is_valid', True),
                'context': getattr(classification, 'context', '')
            }