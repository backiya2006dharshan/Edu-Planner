class LLMProviderError(Exception):
    """Base exception for all LLM provider errors."""
    pass

class LLMConfigurationError(LLMProviderError):
    """Raised when a provider is improperly configured (e.g., missing API keys)."""
    pass

class LLMTimeoutError(LLMProviderError):
    """Raised when a request to an LLM provider times out."""
    pass

class LLMAPIError(LLMProviderError):
    """Raised when an LLM provider returns an API error."""
    pass
