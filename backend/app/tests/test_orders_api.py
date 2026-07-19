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


def create_family(client: TestClient, admin_headers: dict[str, str]) -> dict:
    response = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"})
    assert response.status_code == 201
    return response.json()


def join_family(client: TestClient, member_headers: dict[str, str], invite_code: str) -> dict:
    response = client.post("/api/v1/families/join", headers=member_headers, json={"invite_code": invite_code})
    assert response.status_code == 200
    return response.json()


def share_recipe(client: TestClient, headers: dict[str, str], family_id: int, recipe_id: int) -> dict:
    response = client.post(
        f"/api/v1/families/{family_id}/recipes",
        headers=headers,
        json={"recipe_id": recipe_id},
    )
    assert response.status_code == 201
    return response.json()


def order_payload(recipe_id: int, assignee_user_id: int) -> dict:
    return {
        "recipe_id": recipe_id,
        "assignee_user_id": assignee_user_id,
        "meal_slot": "dinner",
        "scheduled_date": "2026-07-16",
        "scheduled_time": "18:30:00",
        "note": "少油微辣",
        "reminder_time": None,
    }


def create_shared_order(client: TestClient) -> tuple[dict[str, str], dict[str, str], dict, int, dict]:
    requester_headers = auth_headers(client, "requester@example.com")
    assignee_headers = auth_headers(client, "assignee@example.com")
    family = create_family(client, requester_headers)
    join_family(client, assignee_headers, family["invite_code"])
    recipe_id = create_recipe(client, requester_headers, "红烧豆腐")
    share_recipe(client, requester_headers, family["id"], recipe_id)
    assignee_id = current_user_id(client, assignee_headers)
    response = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=requester_headers,
        json=order_payload(recipe_id, assignee_id),
    )
    assert response.status_code == 201
    return requester_headers, assignee_headers, family, recipe_id, response.json()


def test_member_can_create_order_from_shared_family_recipe_and_notify_assignee(client: TestClient) -> None:
    requester_headers = auth_headers(client, "requester@example.com")
    assignee_headers = auth_headers(client, "assignee@example.com")
    family = create_family(client, requester_headers)
    join_family(client, assignee_headers, family["invite_code"])
    recipe_id = create_recipe(client, requester_headers, "红烧豆腐")
    share_recipe(client, requester_headers, family["id"], recipe_id)
    requester_id = current_user_id(client, requester_headers)
    assignee_id = current_user_id(client, assignee_headers)

    response = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=requester_headers,
        json=order_payload(recipe_id, assignee_id),
    )

    assert response.status_code == 201
    order = response.json()
    assert order["family_id"] == family["id"]
    assert order["recipe_id"] == recipe_id
    assert order["recipe_title_snapshot"] == "红烧豆腐"
    assert order["requester_user_id"] == requester_id
    assert order["requester_nickname"] == "requester"
    assert order["assignee_user_id"] == assignee_id
    assert order["assignee_nickname"] == "assignee"
    assert order["status"] == "pending_acceptance"
    assert order["is_requester"] is True
    assert order["is_assignee"] is False

    notifications = client.get("/api/v1/notifications", headers=assignee_headers)
    assert notifications.status_code == 200
    assert len(notifications.json()) == 1
    assert notifications.json()[0]["type"] == "order_assigned"
    assert notifications.json()[0]["order_id"] == order["id"]


def test_disabled_notifications_suppress_order_in_app_notifications(client: TestClient) -> None:
    requester_headers = auth_headers(client, "requester-disabled@example.com")
    assignee_headers = auth_headers(client, "assignee-disabled@example.com")
    family = create_family(client, requester_headers)
    join_family(client, assignee_headers, family["invite_code"])
    recipe_id = create_recipe(client, requester_headers, "土豆炖牛肉")
    share_recipe(client, requester_headers, family["id"], recipe_id)
    assignee_id = current_user_id(client, assignee_headers)

    settings_response = client.patch(
        "/api/v1/users/me/settings",
        headers=assignee_headers,
        json={"notifications_enabled": False},
    )
    assert settings_response.status_code == 200
    assert settings_response.json()["notifications_enabled"] is False

    response = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=requester_headers,
        json=order_payload(recipe_id, assignee_id),
    )

    assert response.status_code == 201
    notifications = client.get("/api/v1/notifications", headers=assignee_headers)
    assert notifications.status_code == 200
    assert notifications.json() == []


def test_order_creation_requires_shared_recipe_and_family_membership(client: TestClient) -> None:
    requester_headers = auth_headers(client, "requester@example.com")
    assignee_headers = auth_headers(client, "assignee@example.com")
    stranger_headers = auth_headers(client, "stranger@example.com")
    family = create_family(client, requester_headers)
    join_family(client, assignee_headers, family["invite_code"])
    unshared_recipe_id = create_recipe(client, requester_headers, "私房菜")
    stranger_id = current_user_id(client, stranger_headers)
    assignee_id = current_user_id(client, assignee_headers)

    unshared_response = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=requester_headers,
        json=order_payload(unshared_recipe_id, assignee_id),
    )
    assert unshared_response.status_code == 404

    non_member_assignee = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=requester_headers,
        json=order_payload(unshared_recipe_id, stranger_id),
    )
    assert non_member_assignee.status_code == 404

    stranger_create = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=stranger_headers,
        json=order_payload(unshared_recipe_id, assignee_id),
    )
    assert stranger_create.status_code == 404


def test_assignee_can_accept_and_complete_order_with_notifications(client: TestClient) -> None:
    requester_headers, assignee_headers, _family, _recipe_id, order = create_shared_order(client)

    accept_response = client.post(f"/api/v1/orders/{order['id']}/accept", headers=assignee_headers)
    assert accept_response.status_code == 200
    accepted = accept_response.json()
    assert accepted["status"] == "accepted"
    assert accepted["accepted_at"] is not None
    assert accepted["is_assignee"] is True

    complete_response = client.post(f"/api/v1/orders/{order['id']}/complete", headers=assignee_headers)
    assert complete_response.status_code == 200
    completed = complete_response.json()
    assert completed["status"] == "completed"
    assert completed["completed_at"] is not None

    requester_notifications = client.get("/api/v1/notifications", headers=requester_headers)
    assert requester_notifications.status_code == 200
    assert [item["type"] for item in requester_notifications.json()] == ["order_completed", "order_accepted"]


def test_invalid_order_transitions_and_permissions_are_rejected(client: TestClient) -> None:
    requester_headers, assignee_headers, _family, _recipe_id, order = create_shared_order(client)
    stranger_headers = auth_headers(client, "stranger@example.com")

    non_assignee_accept = client.post(f"/api/v1/orders/{order['id']}/accept", headers=stranger_headers)
    assert non_assignee_accept.status_code == 404

    requester_complete = client.post(f"/api/v1/orders/{order['id']}/complete", headers=requester_headers)
    assert requester_complete.status_code == 403

    pending_complete = client.post(f"/api/v1/orders/{order['id']}/complete", headers=assignee_headers)
    assert pending_complete.status_code == 400

    accept_response = client.post(f"/api/v1/orders/{order['id']}/accept", headers=assignee_headers)
    assert accept_response.status_code == 200

    second_accept = client.post(f"/api/v1/orders/{order['id']}/accept", headers=assignee_headers)
    assert second_accept.status_code == 400


def test_requester_can_cancel_order_and_terminal_order_cannot_transition(client: TestClient) -> None:
    _requester_headers, assignee_headers, _family, _recipe_id, order = create_shared_order(client)
    requester_headers = auth_headers(client, "owner2@example.com")
    family = create_family(client, requester_headers)
    join_family(client, assignee_headers, family["invite_code"])
    recipe_id = create_recipe(client, requester_headers, "清蒸鱼")
    share_recipe(client, requester_headers, family["id"], recipe_id)
    assignee_id = current_user_id(client, assignee_headers)
    create_response = client.post(
        f"/api/v1/families/{family['id']}/orders",
        headers=requester_headers,
        json=order_payload(recipe_id, assignee_id),
    )
    assert create_response.status_code == 201
    cancel_order = create_response.json()

    assignee_cancel = client.post(
        f"/api/v1/orders/{cancel_order['id']}/cancel",
        headers=assignee_headers,
        json={"cancel_reason": "不想吃了"},
    )
    assert assignee_cancel.status_code == 403

    cancel_response = client.post(
        f"/api/v1/orders/{cancel_order['id']}/cancel",
        headers=requester_headers,
        json={"cancel_reason": "改吃别的"},
    )
    assert cancel_response.status_code == 200
    cancelled = cancel_response.json()
    assert cancelled["status"] == "cancelled"
    assert cancelled["cancel_reason"] == "改吃别的"
    assert cancelled["cancelled_at"] is not None

    accept_cancelled = client.post(f"/api/v1/orders/{cancel_order['id']}/accept", headers=assignee_headers)
    assert accept_cancelled.status_code == 400

    assignee_notifications = client.get("/api/v1/notifications", headers=assignee_headers)
    assert assignee_notifications.status_code == 200
    assert any(item["type"] == "order_cancelled" for item in assignee_notifications.json())


def test_lists_family_orders_and_my_orders(client: TestClient) -> None:
    requester_headers, assignee_headers, family, _recipe_id, order = create_shared_order(client)
    stranger_headers = auth_headers(client, "stranger@example.com")

    family_orders = client.get(f"/api/v1/families/{family['id']}/orders", headers=assignee_headers)
    assert family_orders.status_code == 200
    assert [item["id"] for item in family_orders.json()] == [order["id"]]

    requester_orders = client.get("/api/v1/orders", headers=requester_headers)
    assert requester_orders.status_code == 200
    assert requester_orders.json()[0]["is_requester"] is True

    assignee_orders = client.get("/api/v1/orders", headers=assignee_headers)
    assert assignee_orders.status_code == 200
    assert assignee_orders.json()[0]["is_assignee"] is True

    stranger_family_orders = client.get(f"/api/v1/families/{family['id']}/orders", headers=stranger_headers)
    assert stranger_family_orders.status_code == 404

    stranger_detail = client.get(f"/api/v1/orders/{order['id']}", headers=stranger_headers)
    assert stranger_detail.status_code == 404


def test_requester_or_assignee_can_update_reminder_time(client: TestClient) -> None:
    requester_headers, assignee_headers, _family, _recipe_id, order = create_shared_order(client)
    stranger_headers = auth_headers(client, "stranger@example.com")

    requester_update = client.patch(
        f"/api/v1/orders/{order['id']}/reminder",
        headers=requester_headers,
        json={"reminder_time": "2026-07-16T17:30:00Z"},
    )
    assert requester_update.status_code == 200
    assert requester_update.json()["reminder_time"] is not None

    assignee_update = client.patch(
        f"/api/v1/orders/{order['id']}/reminder",
        headers=assignee_headers,
        json={"reminder_time": None},
    )
    assert assignee_update.status_code == 200
    assert assignee_update.json()["reminder_time"] is None

    stranger_update = client.patch(
        f"/api/v1/orders/{order['id']}/reminder",
        headers=stranger_headers,
        json={"reminder_time": "2026-07-16T17:30:00Z"},
    )
    assert stranger_update.status_code == 404
