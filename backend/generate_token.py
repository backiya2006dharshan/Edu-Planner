import jwt
from datetime import datetime, timedelta, timezone

# From config.py
secret_key = "change-me-in-production"
jwt_algorithm = "HS256"

# Create token
expire = datetime.now(timezone.utc) + timedelta(minutes=1440)
# Usually subject is user id or email. Let's look at auth.py to be sure.
# In FastAPI, subject is usually string id.
to_encode = {"sub": "student@example.com"} # Assuming email is used, or maybe id.
encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=jwt_algorithm)
print(encoded_jwt)
