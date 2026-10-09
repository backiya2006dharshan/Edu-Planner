import asyncio
from app.core.config import get_settings
from app.ai.providers import get_llm_provider

async def test_providers():
    settings = get_settings()
    models_to_test = [
        ("groq", "llama3-70b-8192"),
        ("groq", "llama-3.1-70b-versatile"),
        ("gemini", "gemini-1.5-flash-latest"),
        ("gemini", "gemini-1.5-pro")
    ]
    
    for provider_name, model in models_to_test:
        print(f"\nTesting {provider_name} with model {model}...")
        try:
            provider = get_llm_provider(provider_name, model=model)
            res = await provider.generate("Say hello", system_prompt="You are a helpful assistant.")
            print(f"SUCCESS: {res[:50]}...")
        except Exception as e:
            print(f"FAILED: {type(e).__name__} - {e}")

if __name__ == "__main__":
    asyncio.run(test_providers())
