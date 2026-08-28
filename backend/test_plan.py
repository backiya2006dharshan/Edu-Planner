import requests
import json

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODc5Nzc2ODIsImlhdCI6MTc4Nzg5MTI4Miwicm9sZSI6InN0dWRlbnQiLCJzdWIiOiI2In0.jnOf7atTPjHqS6ZfYIIYb6e_2VfFN0CGlKoucpMOg7M"

url = "http://127.0.0.1:8000/api/ai/learning-plan"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

data = {
    "subject": "Web Development",
    "topic": "React Hooks",
    "learning_goal": "Understand useEffect and useState",
    "college": "My College",
    "semester": "1",
    "regulation": "2021",
    "year": "1"
}

try:
    response = requests.post(url, headers=headers, json=data, timeout=120)
    print("Status Code:", response.status_code)
    print("Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print("Error:", str(e))
