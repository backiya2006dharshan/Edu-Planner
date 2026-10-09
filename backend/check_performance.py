import os
import time
import asyncio
from dotenv import load_dotenv
import urllib.request
import json
from app.ai.providers import get_llm_provider

# Load environment variables
load_dotenv()

async def measure_provider(provider_name: str, model: str):
    start_time = time.time()
    try:
        provider = get_llm_provider(provider_name, model=model)
        # Force a simple generation task
        res = await provider.generate("Respond with exactly one word: 'Alive'.", system_prompt="You are a ping bot.")
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"[OK] {provider_name.upper()} ({model}): {elapsed:.2f} seconds. Response: {res.strip()}")
    except Exception as e:
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"[FAIL] {provider_name.upper()} ({model}): Failed after {elapsed:.2f} seconds. Error: {e}")

async def main():
    print("=== Testing LLM API Key Performance ===")
    
    # 1. Gemini
    await measure_provider("gemini", os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    
    # 2. Groq
    await measure_provider("groq", os.getenv("GROQ_ANALYST_MODEL", "llama-3.1-70b-versatile"))
    
    # 3. OpenRouter
    await measure_provider("openrouter", os.getenv("OPENROUTER_ANALYST_MODEL", "openai/gpt-4o-mini"))

if __name__ == "__main__":
    asyncio.run(main())
