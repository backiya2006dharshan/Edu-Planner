import logging
from abc import ABC, abstractmethod
from typing import Optional

import httpx

from app.core.config import get_settings
from app.ai.exceptions import LLMProviderError, LLMConfigurationError, LLMTimeoutError, LLMAPIError

logger = logging.getLogger(__name__)

def _with_retries(func):
    """Decorator to retry API calls on transient errors."""
    async def wrapper(self, *args, **kwargs):
        settings = get_settings()
        max_retries = settings.llm_max_retries
        
        for attempt in range(max_retries + 1):
            try:
                return await func(self, *args, **kwargs)
            except (httpx.TimeoutException, LLMTimeoutError) as e:
                if attempt == max_retries:
                    raise LLMTimeoutError(f"Request timed out after {max_retries + 1} attempts") from e
                logger.warning(f"Timeout on attempt {attempt + 1}. Retrying...")
            except httpx.HTTPStatusError as e:
                # Do not retry on client errors except 429 Too Many Requests
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    raise LLMAPIError(f"API Error {e.response.status_code}: {e.response.text}") from e
                
                if attempt == max_retries:
                    raise LLMAPIError(f"API request failed after {max_retries + 1} attempts") from e
                logger.warning(f"HTTP error {e.response.status_code} on attempt {attempt + 1}. Retrying...")
            except httpx.RequestError as e:
                # Network errors
                if attempt == max_retries:
                    raise LLMAPIError(f"Network error after {max_retries + 1} attempts") from e
                logger.warning(f"Network error on attempt {attempt + 1}. Retrying...")
    return wrapper


class LLMProvider(ABC):
    """Base class for all LLM providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate a completion for the given prompt.
        
        Args:
            prompt: The user input prompt.
            system_prompt: Optional system instructions.
            
        Returns:
            The generated text string.
            
        Raises:
            LLMProviderError for any provider-related failures.
        """
        pass


class GeminiProvider(LLMProvider):
    """Provider implementation for Google's Gemini API."""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.timeout = settings.llm_timeout_seconds
        
        if not self.api_key:
            raise LLMConfigurationError("GEMINI_API_KEY is not configured")

    @_with_retries
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        
        text_content = prompt
        if system_prompt:
            # Simple concatenation since v1beta structure for system instructions can be complex/changing
            text_content = f"System: {system_prompt}\n\nUser: {prompt}"
            
        payload = {
            "contents": [{"parts": [{"text": text_content}]}]
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                candidates = data.get("candidates", [])
                if not candidates:
                    raise LLMAPIError("No candidates returned from Gemini")
                
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    raise LLMAPIError("No parts returned from Gemini")
                    
                return parts[0].get("text", "")
            except httpx.TimeoutException as e:
                raise LLMTimeoutError("Gemini API request timed out") from e


class OpenRouterProvider(LLMProvider):
    """Provider implementation for OpenRouter API."""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model
        self.timeout = settings.llm_timeout_seconds
        
        if not self.api_key:
            raise LLMConfigurationError("OPENROUTER_API_KEY is not configured")

    @_with_retries
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "http://localhost", # Can be replaced with actual app URL if needed
            "X-Title": "EduPlanner"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model,
            "messages": messages
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                choices = data.get("choices", [])
                if not choices:
                    raise LLMAPIError("No choices returned from OpenRouter")
                    
                return choices[0].get("message", {}).get("content", "")
            except httpx.TimeoutException as e:
                raise LLMTimeoutError("OpenRouter API request timed out") from e


def get_llm_provider(provider_name: str) -> LLMProvider:
    """Factory method to get the requested provider."""
    provider_name = provider_name.lower()
    if provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "openrouter":
        return OpenRouterProvider()
    else:
        raise ValueError(f"Unknown LLM provider: {provider_name}")
