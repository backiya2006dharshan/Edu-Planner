from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    database_path = tmp_path / "curriculum-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path.as_posix()}")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRY_MINUTES", "60")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    from app.core.config import get_settings
    from app.db.database import get_engine, get_session_factory
    from app.services.auth_service import _get_session_factory as auth_session_factory
    from app.services.curriculum_service import _get_session_factory as curriculum_session_factory

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    auth_session_factory.cache_clear()
    curriculum_session_factory.cache_clear()

    import app.main as app_main

    importlib.reload(app_main)

    with TestClient(app_main.app) as test_client:
        yield test_client
