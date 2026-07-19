from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.models import Base


@pytest.fixture()
def client(tmp_path: Path) -> Generator[TestClient, None, None]:
    settings.local_upload_dir = str(tmp_path / "uploads")
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
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


def auth_headers(client: TestClient, email: str = "cook@example.com") -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secret123", "nickname": "Cook"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_upload_image_creates_image_record(client: TestClient) -> None:
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"fake image" + b"\xff\xd9"
    response = client.post(
        "/api/v1/uploads/images",
        headers=auth_headers(client),
        data={"purpose": "recipe_main"},
        files={"file": ("dish.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["purpose"] == "recipe_main"
    assert body["mime_type"] == "image/jpeg"
    assert body["size_bytes"] == len(jpeg_bytes)
    assert body["public_url"].startswith("/static/uploads/recipe_main/")


def test_upload_rejects_non_image_file(client: TestClient) -> None:
    response = client.post(
        "/api/v1/uploads/images",
        headers=auth_headers(client),
        data={"purpose": "recipe_main"},
        files={"file": ("note.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only JPEG, PNG, and WebP images are supported"


def test_upload_rejects_image_content_with_invalid_signature(client: TestClient) -> None:
    response = client.post(
        "/api/v1/uploads/images",
        headers=auth_headers(client),
        data={"purpose": "recipe_main"},
        files={"file": ("dish.jpg", b"not really an image", "image/jpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Uploaded file content does not match its image type"


def test_upload_rejects_path_traversal_purpose(client: TestClient) -> None:
    upload_dir = Path(settings.local_upload_dir)
    escaped_dir = upload_dir.parent / "escape"

    response = client.post(
        "/api/v1/uploads/images",
        headers=auth_headers(client),
        data={"purpose": "../escape"},
        files={"file": ("dish.jpg", b"fake image", "image/jpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid image purpose"
    assert not escaped_dir.exists()
