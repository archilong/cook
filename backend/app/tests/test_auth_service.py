from pydantic import ValidationError
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.auth_service import authenticate_user, register_user


@pytest.fixture()
def db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as session:
        yield session


def test_register_user_with_email_creates_settings(db_session: Session) -> None:
    user = register_user(
        db_session,
        RegisterRequest(email="cook@example.com", phone=None, password="secret123", nickname="Cook"),
    )

    assert user.id is not None
    assert user.email == "cook@example.com"
    assert user.phone is None
    assert user.nickname == "Cook"
    assert user.settings is not None
    assert user.settings.default_reminder_minutes == 30


def test_register_user_rejects_missing_email_and_phone(db_session: Session) -> None:
    with pytest.raises(ValueError, match="email or phone"):
        register_user(
            db_session,
            RegisterRequest(email=None, phone=None, password="secret123", nickname="Cook"),
        )


def test_register_user_rejects_email_like_phone_value() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(email=None, phone="cook@example.com", password="secret123", nickname="Cook")


def test_register_user_rejects_duplicate_email(db_session: Session) -> None:
    request = RegisterRequest(
        email="cook@example.com", phone=None, password="secret123", nickname="Cook"
    )
    register_user(db_session, request)

    with pytest.raises(ValueError, match="already registered"):
        register_user(db_session, request)


def test_register_user_rejects_email_matching_existing_phone(db_session: Session) -> None:
    register_user(
        db_session,
        RegisterRequest.model_construct(email=None, phone="abc@example.com", password="secret123", nickname="Cook"),
    )

    with pytest.raises(ValueError, match="already registered"):
        register_user(
            db_session,
            RegisterRequest(email="abc@example.com", phone=None, password="secret123", nickname="Chef"),
        )


def test_register_user_rejects_phone_matching_existing_email(db_session: Session) -> None:
    register_user(
        db_session,
        RegisterRequest(email="abc@example.com", phone=None, password="secret123", nickname="Cook"),
    )

    with pytest.raises(ValueError, match="already registered"):
        register_user(
            db_session,
            RegisterRequest.model_construct(email=None, phone="abc@example.com", password="secret123", nickname="Chef"),
        )


def test_authenticate_user_with_email(db_session: Session) -> None:
    register_user(
        db_session,
        RegisterRequest(email="cook@example.com", phone=None, password="secret123", nickname="Cook"),
    )

    user = authenticate_user(
        db_session,
        LoginRequest(identifier="cook@example.com", password="secret123"),
    )

    assert user is not None
    assert user.email == "cook@example.com"


def test_authenticate_user_rejects_wrong_password(db_session: Session) -> None:
    register_user(
        db_session,
        RegisterRequest(email="cook@example.com", phone=None, password="secret123", nickname="Cook"),
    )

    user = authenticate_user(
        db_session,
        LoginRequest(identifier="cook@example.com", password="wrong"),
    )

    assert user is None


def test_authenticate_user_rejects_inactive_user(db_session: Session) -> None:
    registered_user = register_user(
        db_session,
        RegisterRequest(email="cook@example.com", phone=None, password="secret123", nickname="Cook"),
    )
    registered_user.status = "disabled"
    db_session.commit()

    user = authenticate_user(
        db_session,
        LoginRequest(identifier="cook@example.com", password="secret123"),
    )

    assert user is None
