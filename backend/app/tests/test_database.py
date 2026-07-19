from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, engine


def test_database_engine_uses_configured_url() -> None:
    assert str(engine.url) == settings.database_url


def test_session_local_creates_session() -> None:
    session = SessionLocal()
    try:
        assert isinstance(session, Session)
    finally:
        session.close()
