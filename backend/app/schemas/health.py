from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class DatabaseHealth(BaseModel):
    configured: bool
    reachable: bool
    details: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    environment: str
    api_version: str
    timestamp: datetime
    database: DatabaseHealth
