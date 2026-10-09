import os
import urllib.request
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_groq_api():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY not found in environment variables.")
        return

    print("Checking GROQ_API_KEY...")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # We will ask a simple question to test the key
    data = {
        "model": "llama3-8b-8192",
        "messages": [
            {
                "role": "user",
                "content": "Write a 2-line poem about coding."
            }
        ]
    }
    
    try:
        req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode("utf-8"))
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            print("\n[OK] API Key is Valid!")
            print("-" * 30)
            print("Response from Groq:")
            print(result["choices"][0]["message"]["content"])
            print("-" * 30)
    except urllib.error.HTTPError as e:
        print(f"\n[FAIL] API Request Failed with status code: {e.code}")
        try:
            error_body = e.read().decode("utf-8")
            print(f"Error details: {error_body}")
        except:
            pass
    except Exception as e:
        print(f"\n[ERROR] An error occurred: {str(e)}")

if __name__ == "__main__":
    test_groq_api()
