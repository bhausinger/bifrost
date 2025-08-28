import asyncio
import re
from typing import Dict, List, Optional
import openai
from openai import AsyncOpenAI

from config.settings import settings
from models.schemas import EmailClassification
from core.logging import get_logger

logger = get_logger(__name__)


class EmailClassifier:
    """
    AI-powered email classifier that determines the type and purpose of email contacts.
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.classification_cache = {}  # Simple in-memory cache
        
        # Rule-based patterns for quick classification
        self.classification_patterns = {
            'management': [
                r'.*manager?@.*',
                r'.*mgmt@.*', 
                r'.*management@.*',
                r'.*agent@.*',
                r'.*rep@.*'
            ],
            'booking': [
                r'.*book.*@.*',
                r'.*booking@.*',
                r'.*shows?@.*',
                r'.*gigs?@.*',
                r'.*tour@.*',
                r'.*events?@.*'
            ],
            'press': [
                r'.*press@.*',
                r'.*pr@.*',
                r'.*media@.*',
                r'.*publicity@.*',
                r'.*promo@.*'
            ],
            'personal': [
                r'.*@(gmail|yahoo|hotmail|outlook)\.com$',
                r'.*@(icloud|me)\.com$'
            ]
        }
    
    async def classify_email(self, email: str, context: str = "") -> EmailClassification:
        """
        Classify an email address using both rule-based and AI-powered methods.
        
        Args:
            email: Email address to classify
            context: Additional context (artist name, surrounding text, etc.)
            
        Returns:
            EmailClassification with type, confidence, and context
        """
        email_lower = email.lower()
        
        # Check cache first
        cache_key = f"{email_lower}:{context}"
        if cache_key in self.classification_cache:
            return self.classification_cache[cache_key]
        
        # Try rule-based classification first (fast)
        rule_classification = self._rule_based_classification(email_lower)
        
        # If rule-based gives high confidence, use it
        if rule_classification.confidence >= 0.8:
            self.classification_cache[cache_key] = rule_classification
            return rule_classification
        
        # Otherwise, use AI classification (if available)
        if self.client and settings.OPENAI_API_KEY:
            try:
                ai_classification = await self._ai_classification(email, context)
                # Combine rule-based and AI results
                final_classification = self._combine_classifications(rule_classification, ai_classification)
                self.classification_cache[cache_key] = final_classification
                return final_classification
            except Exception as e:
                logger.warning(f"AI classification failed for {email}: {str(e)}")
                
        # Fallback to rule-based classification
        self.classification_cache[cache_key] = rule_classification
        return rule_classification
    
    def _rule_based_classification(self, email: str) -> EmailClassification:
        """
        Classify email using predefined patterns.
        """
        for classification_type, patterns in self.classification_patterns.items():
            for pattern in patterns:
                if re.match(pattern, email, re.IGNORECASE):
                    confidence = 0.9 if classification_type != 'personal' else 0.7
                    return EmailClassification(
                        email=email,
                        classification=classification_type,
                        confidence=confidence,
                        context=f"Matched pattern: {pattern}"
                    )
        
        # Default classification
        return EmailClassification(
            email=email,
            classification="general",
            confidence=0.5,
            context="No specific pattern matched"
        )
    
    async def _ai_classification(self, email: str, context: str) -> EmailClassification:
        """
        Use AI to classify email type with context.
        """
        prompt = self._build_classification_prompt(email, context)
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert at classifying email addresses in the music industry. "
                                 "Classify emails as: personal, management, booking, press, or general. "
                                 "Respond in JSON format with 'classification', 'confidence' (0-1), and 'reasoning'."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=150
            )
            
            # Parse AI response
            result_text = response.choices[0].message.content.strip()
            
            # Try to parse as JSON
            try:
                import json
                result = json.loads(result_text)
                
                return EmailClassification(
                    email=email,
                    classification=result.get('classification', 'general'),
                    confidence=float(result.get('confidence', 0.5)),
                    context=result.get('reasoning', 'AI classification')
                )
            except json.JSONDecodeError:
                # Fallback parsing
                return self._parse_ai_response_fallback(email, result_text)
                
        except Exception as e:
            logger.error(f"AI classification error: {str(e)}")
            raise
    
    def _build_classification_prompt(self, email: str, context: str) -> str:
        """
        Build a detailed prompt for AI classification.
        """
        return f"""
        Classify this email address in the context of music industry contact discovery:
        
        Email: {email}
        Artist/Context: {context}
        
        Consider:
        - Domain patterns (gmail/yahoo = personal, company domains = business)
        - Username patterns (manager, booking, press keywords)
        - Music industry context
        
        Classifications:
        - personal: Personal email accounts (gmail, yahoo, etc.)
        - management: Artist managers, representatives, agents
        - booking: Show booking, tour booking, event coordination  
        - press: PR, media, publicity contacts
        - general: Business emails that don't fit specific categories
        
        Provide confidence score 0-1 based on how certain you are.
        """
    
    def _parse_ai_response_fallback(self, email: str, response_text: str) -> EmailClassification:
        """
        Fallback parser if JSON parsing fails.
        """
        response_lower = response_text.lower()
        
        # Extract classification
        classification = "general"
        if "personal" in response_lower:
            classification = "personal"
        elif "management" in response_lower or "manager" in response_lower:
            classification = "management"
        elif "booking" in response_lower:
            classification = "booking"
        elif "press" in response_lower or "media" in response_lower:
            classification = "press"
        
        # Extract confidence (look for numbers between 0 and 1)
        confidence_match = re.search(r'(\d+\.?\d*)', response_text)
        confidence = float(confidence_match.group(1)) if confidence_match else 0.5
        if confidence > 1:
            confidence = confidence / 100  # Convert percentage to decimal
        
        return EmailClassification(
            email=email,
            classification=classification,
            confidence=confidence,
            context="AI classification (fallback parsing)"
        )
    
    def _combine_classifications(
        self, 
        rule_result: EmailClassification, 
        ai_result: EmailClassification
    ) -> EmailClassification:
        """
        Combine rule-based and AI classifications for better accuracy.
        """
        # If both agree, increase confidence
        if rule_result.classification == ai_result.classification:
            combined_confidence = min((rule_result.confidence + ai_result.confidence) / 1.5, 1.0)
            return EmailClassification(
                email=rule_result.email,
                classification=rule_result.classification,
                confidence=combined_confidence,
                context=f"Rule + AI agreement: {rule_result.context}, {ai_result.context}"
            )
        
        # If they disagree, choose the one with higher confidence
        if rule_result.confidence > ai_result.confidence:
            return EmailClassification(
                email=rule_result.email,
                classification=rule_result.classification,
                confidence=rule_result.confidence * 0.8,  # Reduce confidence due to disagreement
                context=f"Rule-based (disagreed with AI): {rule_result.context}"
            )
        else:
            return EmailClassification(
                email=ai_result.email,
                classification=ai_result.classification,
                confidence=ai_result.confidence * 0.8,  # Reduce confidence due to disagreement
                context=f"AI-based (disagreed with rules): {ai_result.context}"
            )
    
    async def classify_multiple_emails(
        self, 
        emails: List[str], 
        context: str = ""
    ) -> List[EmailClassification]:
        """
        Classify multiple emails concurrently.
        """
        tasks = [self.classify_email(email, context) for email in emails]
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    def get_classification_summary(self, classifications: List[EmailClassification]) -> Dict[str, int]:
        """
        Get summary statistics of email classifications.
        """
        summary = {
            'personal': 0,
            'management': 0, 
            'booking': 0,
            'press': 0,
            'general': 0,
            'total': len(classifications)
        }
        
        for classification in classifications:
            if hasattr(classification, 'classification'):
                summary[classification.classification] = summary.get(classification.classification, 0) + 1
        
        return summary