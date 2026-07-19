from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def register_and_get_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "cook@example.com", "password": "secret123", "nickname": "Cook"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_and_update_current_user(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    update_response = client.patch("/api/v1/users/me", json={"nickname": "Chef"}, headers=headers)

    assert update_response.status_code == 200
    assert update_response.json()["nickname"] == "Chef"


def test_get_and_update_user_settings(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    settings_response = client.get("/api/v1/users/me/settings", headers=headers)
    assert settings_response.status_code == 200
    assert settings_response.json()["default_reminder_minutes"] == 30

    update_response = client.patch(
        "/api/v1/users/me/settings",
        json={"theme_mode": "dark", "default_reminder_minutes": 60},
        headers=headers,
    )

    assert update_response.status_code == 200
    assert update_response.json()["theme_mode"] == "dark"
    assert update_response.json()["default_reminder_minutes"] == 60


def test_update_password_allows_login_with_new_password(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    response = client.post(
        "/api/v1/users/me/password",
        json={"current_password": "secret123", "new_password": "newsecret123"},
        headers=headers,
    )

    assert response.status_code == 204

    old_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "secret123"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "newsecret123"},
    )
    assert new_login.status_code == 200


def test_update_password_rejects_wrong_current_password(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    response = client.post(
        "/api/v1/users/me/password",
        json={"current_password": "wrong", "new_password": "newsecret123"},
        headers=headers,
    )

    assert response.status_code == 400
    assert "当前密码" in response.text

    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "secret123"},
    )
    assert login.status_code == 200


def test_update_password_validates_new_password_length(client: TestClient) -> None:
    headers = register_and_get_headers(client)

    response = client.post(
        "/api/v1/users/me/password",
        json={"current_password": "secret123", "new_password": "short"},
        headers=headers,
    )

    assert response.status_code == 422
