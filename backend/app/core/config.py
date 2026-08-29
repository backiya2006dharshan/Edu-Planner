from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "RAG Based Multi-LLM Personalized Learning Platform"
    environment: str = "development"
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expiry_minutes: int = 1440
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    cors_origins: list[str] | str = Field(default_factory=lambda: ["http://localhost:5173"])
    database_url: str | None = None
    chroma_path: str = "./.chroma"

    # --- API Keys ---
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    groq_api_key: str | None = None  # Direct Groq access (optional fallback)

    # --- Model Names ---
    # Analyst agent: OpenRouter / Gemini
    gemini_model: str = "gemini-1.5-flash"
    openrouter_analyst_model: str = "openai/gpt-4o-mini"
    # Optimizer agent: GPT-4o-mini via OpenRouter
    openrouter_optimizer_model: str = "openai/gpt-4o-mini"
    # Evaluator agent: Meta-Llama-3.3-70B via OpenRouter
    openrouter_evaluator_model: str = "meta-llama/llama-3.3-70b-instruct"

    # --- LLM Runtime Settings ---
    llm_timeout_seconds: int = 60
    llm_max_retries: int = 3
    langgraph_max_iterations: int = 15

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        return [str(value).strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
