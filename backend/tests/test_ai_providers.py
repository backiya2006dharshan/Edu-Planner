import pytest
from unittest.mock import AsyncMock, patch, MagicMock

import httpx

from app.core.config import Settings
from app.ai.providers import get_llm_provider, GeminiProvider, OpenRouterProvider
from app.ai.exceptions import LLMConfigurationError, LLMTimeoutError, LLMAPIError

# --- Fixtures ---

@pytest.fixture
def mock_settings():
    return Settings(
        gemini_api_key="fake-gemini-key",
        openrouter_api_key="fake-or-key",
        gemini_model="fake-gemini-model",
        openrouter_model="fake-or-model",
        llm_timeout_seconds=10,
        llm_max_retries=1
    )

# --- Tests ---

def test_missing_api_keys():
    """Test that missing API keys raise Configuration errors."""
    with patch("app.ai.providers.get_settings", return_value=Settings(gemini_api_key=None)):
        with pytest.raises(LLMConfigurationError, match="GEMINI_API_KEY is not configured"):
            GeminiProvider()
            
    with patch("app.ai.providers.get_settings", return_value=Settings(openrouter_api_key=None)):
        with pytest.raises(LLMConfigurationError, match="OPENROUTER_API_KEY is not configured"):
            OpenRouterProvider()


@pytest.mark.anyio
async def test_gemini_provider_success(mock_settings):
    """Test successful generation using Gemini provider."""
    with patch("app.ai.providers.get_settings", return_value=mock_settings):
        provider = GeminiProvider()
        
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "Gemini response"}]}}]
    }
    
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    
    # Mock the context manager behavior of AsyncClient
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.__aexit__.return_value = None
    
    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        result = await provider.generate("Hello Gemini")
        assert result == "Gemini response"
        mock_client_instance.post.assert_called_once()
        args, kwargs = mock_client_instance.post.call_args
        assert kwargs["json"]["contents"][0]["parts"][0]["text"] == "Hello Gemini"
        

@pytest.mark.anyio
async def test_openrouter_provider_success(mock_settings):
    """Test successful generation using OpenRouter provider."""
    with patch("app.ai.providers.get_settings", return_value=mock_settings):
        provider = OpenRouterProvider()
        
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "OpenRouter response"}}]
    }
    
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.__aexit__.return_value = None
    
    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        result = await provider.generate("Hello OR", system_prompt="Be polite")
        assert result == "OpenRouter response"
        mock_client_instance.post.assert_called_once()
        
        args, kwargs = mock_client_instance.post.call_args
        assert kwargs["headers"]["Authorization"] == f"Bearer {mock_settings.openrouter_api_key}"
        assert len(kwargs["json"]["messages"]) == 2
        assert kwargs["json"]["messages"][0]["content"] == "Be polite"


@pytest.mark.anyio
async def test_provider_timeout_retry(mock_settings):
    """Test that timeouts are retried according to max_retries."""
    with patch("app.ai.providers.get_settings", return_value=mock_settings):
        provider = GeminiProvider()
        
        mock_client_instance = AsyncMock()
        mock_client_instance.post.side_effect = httpx.TimeoutException("Mocked timeout")
        
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client_instance.__aexit__.return_value = None
        
        with patch("httpx.AsyncClient", return_value=mock_client_instance):
            with pytest.raises(LLMTimeoutError, match="Request timed out after 2 attempts"):
                await provider.generate("Hello Timeout")
                
            # 1 initial try + 1 retry = 2 attempts total
            assert mock_client_instance.post.call_count == 2


@pytest.mark.anyio
async def test_provider_api_error_no_retry(mock_settings):
    """Test that 4xx HTTP errors (like 400 Bad Request) are NOT retried."""
    with patch("app.ai.providers.get_settings", return_value=mock_settings):
        provider = OpenRouterProvider()
        
        mock_client_instance = AsyncMock()
        
        mock_request = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        
        mock_client_instance.post.side_effect = httpx.HTTPStatusError("400 Error", request=mock_request, response=mock_response)
        
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client_instance.__aexit__.return_value = None
        
        with patch("httpx.AsyncClient", return_value=mock_client_instance):
            with pytest.raises(LLMAPIError, match="API Error 400: Bad Request"):
                await provider.generate("Bad call")
                
            # Should only be called once, no retries on 400
            assert mock_client_instance.post.call_count == 1


def test_factory_method():
    """Test the provider factory function."""
    with patch("app.ai.providers.get_settings", return_value=Settings(gemini_api_key="1", openrouter_api_key="2")):
        assert isinstance(get_llm_provider("gemini"), GeminiProvider)
        assert isinstance(get_llm_provider("openrouter"), OpenRouterProvider)
        
        with pytest.raises(ValueError, match="Unknown LLM provider: fake"):
            get_llm_provider("fake")
