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


def current_user_id(client: TestClient, headers: dict[str, str]) -> int:
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    return int(response.json()["id"])


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


def create_order_with_notification(client: TestClient) -> tuple[dict[str, str], dict[str, str], int]:
    requester_headers = auth_headers(client, "requester@example.com")
    assignee_headers = auth_headers(client, "assignee@example.com")
    family_response = client.post("/api/v1/families", headers=requester_headers, json={"name": "我的家"})
    assert family_response.status_code == 201
    family = family_response.json()
    join_response = client.post(
        "/api/v1/families/join",
        headers=assignee_headers,
        json={"invite_code": family["invite_code"]},
    )
    assert join_response.status_code == 200
    recipe_id = create_recipe(client, requester_headers, "红烧豆腐")
    share_response = client.post(
        f"/api/v1/families/{family['id']}/recipes",
        headers=requester_headers,
        json={"recipe_id": recipe_id},
    )
    assert share_response.status_code == 201
    assignee_id = current_user_id(client, assignee_headers)
    order_response = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=requester_headers,
        json={
            "recipe_id": recipe_id,
            "assignee_user_id": assignee_id,
            "meal_slot": "dinner",
            "scheduled_date": "2026-07-16",
            "scheduled_time": None,
            "note": None,
            "reminder_time": None,
        },
    )
    assert order_response.status_code == 201
    return requester_headers, assignee_headers, int(order_response.json()["id"])


def test_user_can_list_and_mark_own_notifications_read(client: TestClient) -> None:
    _requester_headers, assignee_headers, order_id = create_order_with_notification(client)

    list_response = client.get("/api/v1/notifications", headers=assignee_headers)
    assert list_response.status_code == 200
    notifications = list_response.json()
    assert len(notifications) == 1
    notification = notifications[0]
    assert notification["order_id"] == order_id
    assert notification["type"] == "order_assigned"
    assert notification["is_read"] is False
    assert notification["read_at"] is None

    read_response = client.post(f"/api/v1/notifications/{notification['id']}/read", headers=assignee_headers)
    assert read_response.status_code == 200
    read_notification = read_response.json()
    assert read_notification["is_read"] is True
    assert read_notification["read_at"] is not None

    second_read_response = client.post(f"/api/v1/notifications/{notification['id']}/read", headers=assignee_headers)
    assert second_read_response.status_code == 200
    assert second_read_response.json()["is_read"] is True


def test_user_cannot_read_another_users_notification(client: TestClient) -> None:
    _requester_headers, assignee_headers, _order_id = create_order_with_notification(client)
    stranger_headers = auth_headers(client, "stranger@example.com")
    notifications = client.get("/api/v1/notifications", headers=assignee_headers).json()
    notification_id = notifications[0]["id"]

    stranger_list = client.get("/api/v1/notifications", headers=stranger_headers)
    assert stranger_list.status_code == 200
    assert stranger_list.json() == []

    stranger_read = client.post(f"/api/v1/notifications/{notification_id}/read", headers=stranger_headers)
    assert stranger_read.status_code == 404


def test_mark_all_notifications_read_affects_only_current_user(client: TestClient) -> None:
    requester_headers, assignee_headers, order_id = create_order_with_notification(client)
    accept_response = client.post(f"/api/v1/orders/{order_id}/accept", headers=assignee_headers)
    assert accept_response.status_code == 200

    requester_notifications = client.get("/api/v1/notifications", headers=requester_headers)
    assert requester_notifications.status_code == 200
    assert len(requester_notifications.json()) == 1
    assignee_notifications = client.get("/api/v1/notifications", headers=assignee_headers)
    assert assignee_notifications.status_code == 200
    assert len(assignee_notifications.json()) == 1

    read_all_response = client.post("/api/v1/notifications/read-all", headers=assignee_headers)
    assert read_all_response.status_code == 200
    assert read_all_response.json()["updated_count"] == 1

    assignee_after = client.get("/api/v1/notifications", headers=assignee_headers).json()
    assert all(item["is_read"] for item in assignee_after)
    requester_after = client.get("/api/v1/notifications", headers=requester_headers).json()
    assert requester_after[0]["is_read"] is False
