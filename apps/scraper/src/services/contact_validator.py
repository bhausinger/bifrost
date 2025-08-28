import asyncio
import aiohttp
import re
import smtplib
import socket
from typing import Tuple, Dict, Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import dns.resolver
import dns.exception

from core.logging import get_logger

logger = get_logger(__name__)


class ContactValidator:
    """
    Validates email addresses and phone numbers for deliverability and correctness.
    """
    
    def __init__(self):
        self.validation_cache = {}  # Simple in-memory cache
        self.session = None
        
        # Common disposable email domains to flag
        self.disposable_domains = {
            '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
            'tempmail.org', 'throwaway.email', 'temp-mail.org'
        }
        
        # Common business email providers
        self.business_providers = {
            'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
            'icloud.com', 'aol.com', 'protonmail.com'
        }
    
    async def validate_email(self, email: str) -> Tuple[bool, float]:
        """
        Validate email address and return deliverability score.
        
        Args:
            email: Email address to validate
            
        Returns:
            Tuple of (is_valid, deliverability_score)
            deliverability_score: 0.0-1.0 where 1.0 is highest confidence
        """
        email_lower = email.lower().strip()
        
        # Check cache first
        if email_lower in self.validation_cache:
            return self.validation_cache[email_lower]
        
        try:
            # Step 1: Format validation
            if not self._is_valid_email_format(email_lower):
                self.validation_cache[email_lower] = (False, 0.0)
                return (False, 0.0)
            
            # Step 2: Domain validation
            domain = email_lower.split('@')[1]
            domain_score = await self._validate_domain(domain)
            
            if domain_score == 0.0:
                self.validation_cache[email_lower] = (False, 0.0)
                return (False, 0.0)
            
            # Step 3: Disposable email check
            if domain in self.disposable_domains:
                self.validation_cache[email_lower] = (True, 0.2)  # Valid format but low deliverability
                return (True, 0.2)
            
            # Step 4: Calculate deliverability score
            deliverability_score = self._calculate_deliverability_score(email_lower, domain, domain_score)
            
            result = (True, deliverability_score)
            self.validation_cache[email_lower] = result
            return result
            
        except Exception as e:
            logger.warning(f"Email validation error for {email}: {str(e)}")
            # Default to valid but low confidence if validation fails
            result = (True, 0.5)
            self.validation_cache[email_lower] = result
            return result
    
    def _is_valid_email_format(self, email: str) -> bool:
        """
        Check if email has valid format using regex.
        """
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(email_pattern, email):
            return False
        
        # Additional checks
        if len(email) > 254:  # RFC 5321 limit
            return False
            
        local, domain = email.split('@')
        if len(local) > 64:  # RFC 5321 limit for local part
            return False
            
        if len(domain) > 253:  # RFC 1035 limit for domain
            return False
        
        # Check for consecutive dots
        if '..' in email:
            return False
            
        return True
    
    async def _validate_domain(self, domain: str) -> float:
        """
        Validate domain and return confidence score.
        """
        try:
            # Check MX record
            mx_score = await self._check_mx_record(domain)
            if mx_score == 0.0:
                return 0.0
            
            # Check A record (fallback if no MX)
            a_score = await self._check_a_record(domain)
            
            return max(mx_score, a_score * 0.8)  # Prefer MX record
            
        except Exception as e:
            logger.warning(f"Domain validation error for {domain}: {str(e)}")
            return 0.5  # Neutral score if validation fails
    
    async def _check_mx_record(self, domain: str) -> float:
        """
        Check if domain has valid MX record.
        """
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            if mx_records:
                return 1.0  # High confidence if MX record exists
        except dns.exception.DNSException:
            pass
        except Exception as e:
            logger.debug(f"MX record check failed for {domain}: {str(e)}")
        
        return 0.0
    
    async def _check_a_record(self, domain: str) -> float:
        """
        Check if domain has valid A record.
        """
        try:
            a_records = dns.resolver.resolve(domain, 'A')
            if a_records:
                return 0.7  # Lower confidence than MX record
        except dns.exception.DNSException:
            pass
        except Exception as e:
            logger.debug(f"A record check failed for {domain}: {str(e)}")
        
        return 0.0
    
    def _calculate_deliverability_score(self, email: str, domain: str, domain_score: float) -> float:
        """
        Calculate overall deliverability score based on various factors.
        """
        score = domain_score
        
        # Adjust based on provider type
        if domain in self.business_providers:
            if domain in ['gmail.com', 'outlook.com']:
                score *= 0.95  # Very reliable
            else:
                score *= 0.9  # Reliable
        else:
            # Custom domain - slightly lower confidence
            score *= 0.85
        
        # Penalize obviously fake patterns
        local_part = email.split('@')[0]
        if self._looks_fake(local_part):
            score *= 0.6
        
        # Bonus for business-like patterns
        if self._looks_professional(local_part):
            score = min(score * 1.1, 1.0)
        
        return round(score, 2)
    
    def _looks_fake(self, local_part: str) -> bool:
        """
        Check if local part looks fake or temporary.
        """
        fake_patterns = [
            r'^test\d*$',
            r'^temp\d*$',
            r'^fake\d*$',
            r'^noreply\d*$',
            r'^no-reply\d*$',
            r'^\d+$',  # Only numbers
            r'^.{1,2}$',  # Too short
        ]
        
        for pattern in fake_patterns:
            if re.match(pattern, local_part, re.IGNORECASE):
                return True
        
        return False
    
    def _looks_professional(self, local_part: str) -> bool:
        """
        Check if local part looks professional/business-like.
        """
        professional_patterns = [
            r'.*manager.*',
            r'.*booking.*',
            r'.*contact.*',
            r'.*info.*',
            r'.*business.*',
            r'.*press.*',
            r'.*media.*',
            r'.*admin.*'
        ]
        
        for pattern in professional_patterns:
            if re.match(pattern, local_part, re.IGNORECASE):
                return True
        
        return False
    
    async def validate_phone_number(self, phone: str) -> Tuple[bool, str]:
        """
        Validate and normalize phone number.
        
        Args:
            phone: Phone number to validate
            
        Returns:
            Tuple of (is_valid, normalized_phone)
        """
        # Remove all non-digits
        digits_only = re.sub(r'\D', '', phone)
        
        # US phone number validation
        if len(digits_only) == 10:
            # Format: (xxx) xxx-xxxx
            formatted = f"({digits_only[:3]}) {digits_only[3:6]}-{digits_only[6:]}"
            return (True, formatted)
        elif len(digits_only) == 11 and digits_only.startswith('1'):
            # Format: +1 (xxx) xxx-xxxx
            formatted = f"+1 ({digits_only[1:4]}) {digits_only[4:7]}-{digits_only[7:]}"
            return (True, formatted)
        
        # International number (basic validation)
        if len(digits_only) >= 7 and len(digits_only) <= 15:
            # Format with country code
            if len(digits_only) > 10:
                country_code = digits_only[:-10]
                local_number = digits_only[-10:]
                formatted = f"+{country_code} {local_number}"
            else:
                formatted = digits_only
            return (True, formatted)
        
        return (False, phone)  # Return original if can't validate
    
    async def validate_multiple_emails(self, emails: List[str]) -> Dict[str, Tuple[bool, float]]:
        """
        Validate multiple emails concurrently.
        """
        tasks = [self.validate_email(email) for email in emails]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        validation_results = {}
        for email, result in zip(emails, results):
            if isinstance(result, Exception):
                logger.warning(f"Validation failed for {email}: {str(result)}")
                validation_results[email] = (True, 0.5)  # Default to valid but low confidence
            else:
                validation_results[email] = result
        
        return validation_results
    
    async def get_validation_summary(self, emails: List[str]) -> Dict[str, int]:
        """
        Get summary of email validation results.
        """
        validation_results = await self.validate_multiple_emails(emails)
        
        summary = {
            'total': len(emails),
            'valid': 0,
            'invalid': 0,
            'high_confidence': 0,  # Score >= 0.8
            'medium_confidence': 0,  # Score 0.5-0.79
            'low_confidence': 0  # Score < 0.5
        }
        
        for email, (is_valid, score) in validation_results.items():
            if is_valid:
                summary['valid'] += 1
                if score >= 0.8:
                    summary['high_confidence'] += 1
                elif score >= 0.5:
                    summary['medium_confidence'] += 1
                else:
                    summary['low_confidence'] += 1
            else:
                summary['invalid'] += 1
        
        return summary
    
    def clear_cache(self):
        """Clear validation cache."""
        self.validation_cache.clear()
        logger.info("Validation cache cleared")
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()