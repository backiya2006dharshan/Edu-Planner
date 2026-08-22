import os
import sys
import tempfile
from fastapi.testclient import TestClient

print('cwd', os.getcwd())
print('PYTHONPATH', os.environ.get('PYTHONPATH'))
print('sys.path[0]', sys.path[0])
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
print('project_root', project_root)
sys.path.insert(0, project_root)
print('sys.path[0] after insert', sys.path[0])

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mktemp(suffix='.db')}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["ACCESS_TOKEN_EXPIRY_MINUTES"] = "60"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from app.main import app
from app.db.database import get_engine, Base
engine = get_engine()
if engine is not None:
    print('creating tables via Base.metadata.create_all')
    Base.metadata.create_all(bind=engine)
    print('tables now:', list(Base.metadata.tables.keys()))

client = TestClient(app)
resp = client.post("/api/auth/register", json={"email":"auth-teacher@example.com","full_name":"Auth Teacher","password":"Password123!","role":"teacher"})
print('status', resp.status_code)
try:
    print(resp.json())
except Exception as e:
    print('no json', e)

# tables were created above
