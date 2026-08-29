import asyncio
import logging
from functools import lru_cache

from sqlalchemy import text
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


@lru_cache(maxsize=1)
def get_engine() -> Engine | None:
    settings = get_settings()
    if not settings.database_url:
        return None
    return create_engine(settings.database_url, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session] | None:
    engine = get_engine()
    if engine is None:
        return None
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


# New profile columns added to the users table.
# Each tuple is (column_name, column_definition).
_USER_PROFILE_COLUMNS: list[tuple[str, str]] = [
    ("phone",          "VARCHAR(30)"),
    ("department",     "VARCHAR(100)"),
    ("year_of_study",  "VARCHAR(20)"),
    ("bio",            "TEXT"),
    ("college",        "VARCHAR(255)"),
    ("regulation",     "VARCHAR(50)"),
    ("semester",       "VARCHAR(20)"),
]


def _run_profile_migrations(engine: Engine) -> None:
    """Add new user profile columns that don't yet exist in the database."""
    with engine.connect() as conn:
        dialect_name = engine.dialect.name
        if dialect_name == "sqlite":
            res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            existing_cols = {row[1] for row in res}
            for col_name, col_type in _USER_PROFILE_COLUMNS:
                if col_name not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception as exc:
                        conn.rollback()
                        logger.debug("Could not add column users.%s: %s", col_name, exc)
        else:
            for col_name, col_type in _USER_PROFILE_COLUMNS:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                    conn.commit()
                except Exception as exc:
                    conn.rollback()
                    logger.debug("Could not add column users.%s: %s", col_name, exc)


async def init_db() -> None:
    engine = get_engine()
    if engine is None:
        logger.warning("Skipping table creation because DATABASE_URL is not configured")
        return

    def create_tables() -> None:
        from app.models import curriculum  # noqa: F401
        from app.models import material    # noqa: F401
        from app.models import user        # noqa: F401
        from app.models import assessment  # noqa: F401
        from app.models import learning_plan  # noqa: F401
        from app.models import classroom      # noqa: F401

        Base.metadata.create_all(bind=engine)

        # Run additive column migrations after create_all
        _run_profile_migrations(engine)

    try:
        await asyncio.to_thread(create_tables)
    except Exception as exc:  # pragma: no cover - startup guard
        logger.warning("Database initialization failed: %s", exc)


async def check_database_health() -> dict[str, object]:
    settings = get_settings()
    engine = get_engine()

    if engine is None:
        return {
            "configured": False,
            "reachable": False,
            "details": "DATABASE_URL is not configured",
        }

    try:
        def run_ping() -> None:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))

        await asyncio.to_thread(run_ping)
        return {
            "configured": True,
            "reachable": True,
            "details": f"Connected using {settings.database_url.split('@')[-1] if '@' in settings.database_url else 'configured database'}",
        }
    except Exception as exc:  # pragma: no cover - defensive health guard
        logger.warning("Database health check failed: %s", exc)
        return {
            "configured": True,
            "reachable": False,
            "details": str(exc),
        }
