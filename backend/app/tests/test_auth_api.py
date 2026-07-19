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


def test_register_login_and_me_flow(client: TestClient) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": "cook@example.com", "password": "secret123", "nickname": "Cook"},
    )
    assert register_response.status_code == 201
    token = register_response.json()["access_token"]
    assert register_response.json()["token_type"] == "bearer"
    assert register_response.json()["user"]["email"] == "cook@example.com"

    login_response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    login_token = login_response.json()["access_token"]

    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login_token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "cook@example.com"
    assert token


def test_login_rejects_wrong_password(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "cook@example.com", "password": "secret123", "nickname": "Cook"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "cook@example.com", "password": "wrong"},
    )

    assert response.status_code == 401
