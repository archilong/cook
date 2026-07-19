from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base
from app.services import family_service


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


def test_create_family_creates_admin_membership_and_lists_family(client: TestClient) -> None:
    headers = auth_headers(client, "admin@example.com")

    create_response = client.post(
        "/api/v1/families",
        headers=headers,
        json={"name": "我的家", "description": "周末一起做饭"},
    )

    assert create_response.status_code == 201
    family = create_response.json()
    assert family["id"] > 0
    assert family["name"] == "我的家"
    assert family["description"] == "周末一起做饭"
    assert family["role"] == "admin"
    assert len(family["invite_code"]) >= 8
    assert family["member_count"] == 1

    list_response = client.get("/api/v1/families", headers=headers)
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [family["id"]]

    members_response = client.get(f"/api/v1/families/{family['id']}/members", headers=headers)
    assert members_response.status_code == 200
    members = members_response.json()
    assert len(members) == 1
    assert members[0]["role"] == "admin"
    assert members[0]["nickname"] == "admin"


def test_join_family_by_invite_code_adds_member(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()

    join_response = client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )

    assert join_response.status_code == 200
    joined = join_response.json()
    assert joined["id"] == family["id"]
    assert joined["role"] == "member"
    assert joined["invite_code"] is None
    assert joined["member_count"] == 2

    members_response = client.get(f"/api/v1/families/{family['id']}/members", headers=member_headers)
    assert members_response.status_code == 200
    assert {member["role"] for member in members_response.json()} == {"admin", "member"}


def test_admin_can_refresh_invite_code_and_member_cannot(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()
    client.post("/api/v1/families/join", headers=member_headers, json={"invite_code": family["invite_code"]})

    member_response = client.post(
        f"/api/v1/families/{family['id']}/invite-code/refresh", headers=member_headers
    )
    assert member_response.status_code == 403

    admin_response = client.post(
        f"/api/v1/families/{family['id']}/invite-code/refresh", headers=admin_headers
    )
    assert admin_response.status_code == 200
    assert admin_response.json()["invite_code"] != family["invite_code"]


def test_admin_can_remove_member_but_member_cannot_remove_others(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()
    client.post("/api/v1/families/join", headers=member_headers, json={"invite_code": family["invite_code"]})
    members = client.get(f"/api/v1/families/{family['id']}/members", headers=admin_headers).json()
    admin = next(member for member in members if member["role"] == "admin")
    ordinary_member = next(member for member in members if member["role"] == "member")

    member_remove_response = client.delete(
        f"/api/v1/families/{family['id']}/members/{admin['user_id']}", headers=member_headers
    )
    assert member_remove_response.status_code == 403

    self_remove_response = client.delete(
        f"/api/v1/families/{family['id']}/members/{admin['user_id']}", headers=admin_headers
    )
    assert self_remove_response.status_code == 400
    assert self_remove_response.json()["detail"] == "Admin cannot remove self"

    admin_remove_response = client.delete(
        f"/api/v1/families/{family['id']}/members/{ordinary_member['user_id']}",
        headers=admin_headers,
    )
    assert admin_remove_response.status_code == 204

    removed_member_detail = client.get(f"/api/v1/families/{family['id']}", headers=member_headers)
    assert removed_member_detail.status_code == 404


def test_removed_member_cannot_rejoin_with_existing_invite_code(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()
    client.post("/api/v1/families/join", headers=member_headers, json={"invite_code": family["invite_code"]})
    members = client.get(f"/api/v1/families/{family['id']}/members", headers=admin_headers).json()
    ordinary_member = next(member for member in members if member["role"] == "member")
    remove_response = client.delete(
        f"/api/v1/families/{family['id']}/members/{ordinary_member['user_id']}",
        headers=admin_headers,
    )
    assert remove_response.status_code == 204

    rejoin_response = client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )

    assert rejoin_response.status_code == 403
    assert rejoin_response.json()["detail"] == "Member has been removed from this family"
    removed_member_detail = client.get(f"/api/v1/families/{family['id']}", headers=member_headers)
    assert removed_member_detail.status_code == 404


def test_old_invite_code_no_longer_works_after_refresh(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()

    refresh_response = client.post(
        f"/api/v1/families/{family['id']}/invite-code/refresh", headers=admin_headers
    )
    assert refresh_response.status_code == 200
    new_invite_code = refresh_response.json()["invite_code"]

    old_join_response = client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )
    assert old_join_response.status_code == 404

    new_join_response = client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": new_invite_code},
    )
    assert new_join_response.status_code == 200


def test_invalid_invite_code_maps_to_404(client: TestClient) -> None:
    headers = auth_headers(client, "member@example.com")

    response = client.post(
        "/api/v1/families/join",
        headers=headers,
        json={"invite_code": "NOPE1234"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Invite code not found"


def test_join_family_is_idempotent_for_active_member(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    member_headers = auth_headers(client, "member@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()

    first_join = client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )
    second_join = client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )

    assert first_join.status_code == 200
    assert second_join.status_code == 200
    assert second_join.json()["member_count"] == 2
    members_response = client.get(f"/api/v1/families/{family['id']}/members", headers=admin_headers)
    assert members_response.status_code == 200
    assert len(members_response.json()) == 2


def test_non_member_cannot_list_members_or_refresh_invite_code(client: TestClient) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    stranger_headers = auth_headers(client, "stranger@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()

    members_response = client.get(f"/api/v1/families/{family['id']}/members", headers=stranger_headers)
    assert members_response.status_code == 404

    refresh_response = client.post(
        f"/api/v1/families/{family['id']}/invite-code/refresh", headers=stranger_headers
    )
    assert refresh_response.status_code == 404


def test_create_family_retries_when_invite_code_collides(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    existing = client.post("/api/v1/families", headers=admin_headers, json={"name": "已有家庭"}).json()
    codes = iter([existing["invite_code"], "UNIQUECODE"])
    monkeypatch.setattr(family_service, "_generate_invite_code", lambda: next(codes))
    other_headers = auth_headers(client, "other@example.com")

    response = client.post("/api/v1/families", headers=other_headers, json={"name": "新家庭"})

    assert response.status_code == 201
    assert response.json()["invite_code"] == "UNIQUECODE"


def test_refresh_invite_code_retries_when_invite_code_collides(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin_headers = auth_headers(client, "admin@example.com")
    other_headers = auth_headers(client, "other@example.com")
    family = client.post("/api/v1/families", headers=admin_headers, json={"name": "我的家"}).json()
    other_family = client.post("/api/v1/families", headers=other_headers, json={"name": "另一个家"}).json()
    codes = iter([other_family["invite_code"], "REFRESHCODE"])
    monkeypatch.setattr(family_service, "_generate_invite_code", lambda: next(codes))

    response = client.post(
        f"/api/v1/families/{family['id']}/invite-code/refresh", headers=admin_headers
    )

    assert response.status_code == 200
    assert response.json()["invite_code"] == "REFRESHCODE"
