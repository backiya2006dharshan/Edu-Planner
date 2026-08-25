from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import login as auth_login
from app.api.auth import me as auth_me
from app.api.auth import register as auth_register
from app.api.auth import router as auth_router
from app.api.curriculum import router as curriculum_router
from app.api.health import router as health_router
from app.api.materials import router as material_router
from app.core.config import get_settings
from app.db.database import init_db

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(curriculum_router)
app.include_router(material_router)
app.include_router(material_router, prefix="/api", include_in_schema=False)
app.include_router(curriculum_router, prefix="/api", include_in_schema=False)

from fastapi import status as _status

app.add_api_route("/api/auth/register", auth_register, methods=["POST"], include_in_schema=False, status_code=_status.HTTP_201_CREATED)
app.add_api_route("/api/auth/login", auth_login, methods=["POST"], include_in_schema=False)
app.add_api_route("/api/auth/me", auth_me, methods=["GET"], include_in_schema=False)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "message": "Backend is running",
        "health": "/health",
    }
