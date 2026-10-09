from app.core.security import hash_password, verify_password

p = "testpass"
h = hash_password(p)
print(f"Hash: {h}")
print(f"Valid: {verify_password(p, h)}")
print(f"Invalid: {verify_password('wrong', h)}")
