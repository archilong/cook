from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
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


def auth_headers(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secret123", "nickname": "Cook"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def recipe_payload(title: str = "番茄炒蛋") -> dict[str, object]:
    return {
        "title": title,
        "creator_name": "Cook",
        "description": "家常快手菜",
        "main_image_id": None,
        "tags": ["家常", "鸡蛋"],
        "steps": [
            {"step_no": 1, "instruction": "鸡蛋打散", "image_id": None, "estimated_minutes": 2},
            {"step_no": 2, "instruction": "番茄炒软后倒入鸡蛋", "image_id": None, "estimated_minutes": 6},
        ],
    }


def test_create_list_detail_update_and_delete_recipe(client: TestClient) -> None:
    headers = auth_headers(client, "cook@example.com")

    create_response = client.post("/api/v1/recipes", headers=headers, json=recipe_payload())
    assert create_response.status_code == 201
    created = create_response.json()
    recipe_id = created["id"]
    assert created["title"] == "番茄炒蛋"
    assert [step["instruction"] for step in created["steps"]] == ["鸡蛋打散", "番茄炒软后倒入鸡蛋"]

    list_response = client.get("/api/v1/recipes", headers=headers)
    assert list_response.status_code == 200
    assert [recipe["id"] for recipe in list_response.json()] == [recipe_id]

    detail_response = client.get(f"/api/v1/recipes/{recipe_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["tags"] == ["家常", "鸡蛋"]

    update_response = client.patch(
        f"/api/v1/recipes/{recipe_id}",
        headers=headers,
        json={
            "title": "新版番茄炒蛋",
            "steps": [{"step_no": 1, "instruction": "先炒番茄，再加蛋", "image_id": None, "estimated_minutes": 8}],
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "新版番茄炒蛋"
    assert len(updated["steps"]) == 1
    assert updated["steps"][0]["instruction"] == "先炒番茄，再加蛋"

    delete_response = client.delete(f"/api/v1/recipes/{recipe_id}", headers=headers)
    assert delete_response.status_code == 204

    missing_response = client.get(f"/api/v1/recipes/{recipe_id}", headers=headers)
    assert missing_response.status_code == 404


JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"fake image" + b"\xff\xd9"


def upload_image(client: TestClient, headers: dict[str, str]) -> int:
    response = client.post(
        "/api/v1/uploads/images",
        headers=headers,
        data={"purpose": "recipe_main"},
        files={"file": ("dish.jpg", JPEG_BYTES, "image/jpeg")},
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def test_user_cannot_read_or_update_another_users_recipe(client: TestClient) -> None:
    owner_headers = auth_headers(client, "owner@example.com")
    other_headers = auth_headers(client, "other@example.com")
    create_response = client.post("/api/v1/recipes", headers=owner_headers, json=recipe_payload("红烧肉"))
    assert create_response.status_code == 201
    recipe_id = create_response.json()["id"]

    read_response = client.get(f"/api/v1/recipes/{recipe_id}", headers=other_headers)
    assert read_response.status_code == 404

    update_response = client.patch(
        f"/api/v1/recipes/{recipe_id}", headers=other_headers, json={"title": "不允许"}
    )
    assert update_response.status_code == 404


def test_created_recipe_returns_main_image_metadata(client: TestClient) -> None:
    headers = auth_headers(client, "cook@example.com")
    image_id = upload_image(client, headers)
    payload = recipe_payload()
    payload["main_image_id"] = image_id

    create_response = client.post("/api/v1/recipes", headers=headers, json=payload)

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["main_image"]["id"] == image_id
    assert created["main_image"]["public_url"].startswith("/static/uploads/recipe_main/")

    list_response = client.get("/api/v1/recipes", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()[0]["main_image"]["id"] == image_id


def test_recipe_rejects_images_owned_by_another_user(client: TestClient) -> None:
    owner_headers = auth_headers(client, "owner@example.com")
    other_headers = auth_headers(client, "other@example.com")
    other_image_id = upload_image(client, other_headers)

    payload = recipe_payload()
    payload["main_image_id"] = other_image_id

    response = client.post("/api/v1/recipes", headers=owner_headers, json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "Image not found"


def test_recipe_rejects_step_images_owned_by_another_user(client: TestClient) -> None:
    owner_headers = auth_headers(client, "owner@example.com")
    other_headers = auth_headers(client, "other@example.com")
    other_image_id = upload_image(client, other_headers)

    payload = recipe_payload()
    payload["steps"] = [
        {"step_no": 1, "instruction": "使用图片", "image_id": other_image_id, "estimated_minutes": 2}
    ]

    response = client.post("/api/v1/recipes", headers=owner_headers, json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "Image not found"


def test_recipe_rejects_missing_image_id(client: TestClient) -> None:
    headers = auth_headers(client, "cook@example.com")
    payload = recipe_payload()
    payload["main_image_id"] = 999999

    response = client.post("/api/v1/recipes", headers=headers, json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "Image not found"


def test_update_recipe_rejects_empty_steps(client: TestClient) -> None:
    headers = auth_headers(client, "cook@example.com")
    create_response = client.post("/api/v1/recipes", headers=headers, json=recipe_payload())
    assert create_response.status_code == 201
    recipe_id = create_response.json()["id"]

    response = client.patch(f"/api/v1/recipes/{recipe_id}", headers=headers, json={"steps": []})

    assert response.status_code == 422


def test_recipe_rejects_duplicate_step_numbers(client: TestClient) -> None:
    headers = auth_headers(client, "cook@example.com")
    payload = recipe_payload()
    payload["steps"] = [
        {"step_no": 1, "instruction": "第一步", "image_id": None, "estimated_minutes": 2},
        {"step_no": 1, "instruction": "重复步骤号", "image_id": None, "estimated_minutes": 3},
    ]

    response = client.post("/api/v1/recipes", headers=headers, json=payload)

    assert response.status_code == 422
