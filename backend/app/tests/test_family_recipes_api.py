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
        json={"email": email, "password": "secret123", "nickname": email.split("@")[0]},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_recipe(client: TestClient, headers: dict[str, str], title: str = "番茄炒蛋") -> int:
    response = client.post(
        "/api/v1/recipes",
        headers=headers,
        json={
            "title": title,
            "creator_name": "Cook",
            "description": "家常菜",
            "main_image_id": None,
            "tags": ["家常"],
            "steps": [{"step_no": 1, "instruction": "炒熟", "image_id": None, "estimated_minutes": 5}],
        },
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def create_family(client: TestClient, admin_headers: dict[str, str]) -> dict:
    response = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"})
    assert response.status_code == 201
    return response.json()


def test_owner_can_share_recipe_and_family_member_can_list_it(client: TestClient) -> None:
    owner_headers = auth_headers(client, "owner@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = create_family(client, owner_headers)
    client.post("/api/v1/families/join", headers=member_headers, json={"invite_code": family["invite_code"]})
    recipe_id = create_recipe(client, owner_headers)

    share_response = client.post(
        f"/api/v1/families/{family['id']}/recipes",
        headers=owner_headers,
        json={"recipe_id": recipe_id},
    )

    assert share_response.status_code == 201
    shared = share_response.json()
    assert shared["recipe_id"] == recipe_id
    assert shared["recipe"]["title"] == "番茄炒蛋"
    assert shared["shared_by_nickname"] == "owner"

    list_response = client.get(f"/api/v1/families/{family['id']}/recipes", headers=member_headers)
    assert list_response.status_code == 200
    assert [item["recipe_id"] for item in list_response.json()] == [recipe_id]


def test_non_member_cannot_list_or_share_family_recipes(client: TestClient) -> None:
    owner_headers = auth_headers(client, "owner@example.com")
    stranger_headers = auth_headers(client, "stranger@example.com")
    family = create_family(client, owner_headers)
    recipe_id = create_recipe(client, stranger_headers)

    list_response = client.get(f"/api/v1/families/{family['id']}/recipes", headers=stranger_headers)
    assert list_response.status_code == 404

    share_response = client.post(
        f"/api/v1/families/{family['id']}/recipes",
        headers=stranger_headers,
        json={"recipe_id": recipe_id},
    )
    assert share_response.status_code == 404


def test_member_cannot_share_another_users_recipe(client: TestClient) -> None:
    owner_headers = auth_headers(client, "owner@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = create_family(client, owner_headers)
    client.post("/api/v1/families/join", headers=member_headers, json={"invite_code": family["invite_code"]})
    owner_recipe_id = create_recipe(client, owner_headers)

    response = client.post(
        f"/api/v1/families/{family['id']}/recipes",
        headers=member_headers,
        json={"recipe_id": owner_recipe_id},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Recipe not found"


def test_shared_recipe_can_be_removed_by_owner_or_admin_only(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    member_headers = auth_headers(client, "member@example.com")
    other_headers = auth_headers(client, "other@example.com")
    family = create_family(client, admin_headers)
    client.post("/api/v1/families/join", headers=member_headers, json={"invite_code": family["invite_code"]})
    client.post("/api/v1/families/join", headers=other_headers, json={"invite_code": family["invite_code"]})
    recipe_id = create_recipe(client, member_headers)
    client.post(f"/api/v1/families/{family['id']}/recipes", headers=member_headers, json={"recipe_id": recipe_id})

    other_remove = client.delete(f"/api/v1/families/{family['id']}/recipes/{recipe_id}", headers=other_headers)
    assert other_remove.status_code == 403

    owner_remove = client.delete(f"/api/v1/families/{family['id']}/recipes/{recipe_id}", headers=member_headers)
    assert owner_remove.status_code == 204

    client.post(f"/api/v1/families/{family['id']}/recipes", headers=member_headers, json={"recipe_id": recipe_id})
    admin_remove = client.delete(f"/api/v1/families/{family['id']}/recipes/{recipe_id}", headers=admin_headers)
    assert admin_remove.status_code == 204


def test_deleted_shared_recipe_is_excluded_from_family_recipe_counts(client: TestClient) -> None:
    owner_headers = auth_headers(client, "owner@example.com")
    family = create_family(client, owner_headers)
    recipe_id = create_recipe(client, owner_headers)
    share_response = client.post(
        f"/api/v1/families/{family['id']}/recipes",
        headers=owner_headers,
        json={"recipe_id": recipe_id},
    )
    assert share_response.status_code == 201

    delete_response = client.delete(f"/api/v1/recipes/{recipe_id}", headers=owner_headers)
    assert delete_response.status_code == 204

    family_detail = client.get(f"/api/v1/families/{family['id']}", headers=owner_headers)
    assert family_detail.status_code == 200
    assert family_detail.json()["recipe_count"] == 0

    family_list = client.get("/api/v1/families", headers=owner_headers)
    assert family_list.status_code == 200
    assert family_list.json()[0]["recipe_count"] == 0

    recipes_response = client.get(f"/api/v1/families/{family['id']}/recipes", headers=owner_headers)
    assert recipes_response.status_code == 200
    assert recipes_response.json() == []
