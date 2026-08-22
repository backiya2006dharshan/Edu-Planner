from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings
from app.db.database import check_database_health
from app.schemas.health import DatabaseHealth, HealthResponse

router = APIRouter(tags=["health"])


async def build_health_response() -> HealthResponse:
    settings = get_settings()
    database_state = DatabaseHealth.model_validate(await check_database_health())
    status = "ok"
    if database_state.configured and not database_state.reachable:
        status = "degraded"

    return HealthResponse(
        status=status,
        service=settings.app_name,
        environment=settings.environment,
        api_version="v1",
        timestamp=datetime.now(timezone.utc),
        database=database_state,
    )


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return await build_health_response()


@router.get("/api/health", response_model=HealthResponse, include_in_schema=False)
async def api_health() -> HealthResponse:
    return await build_health_response()
