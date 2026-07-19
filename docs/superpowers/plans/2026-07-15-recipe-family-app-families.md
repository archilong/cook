# Milestone 4 Families and Shared Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 4 family spaces, invite-code joining, member administration, and shared family recipes.

**Architecture:** Backend adds family, family member, and family recipe models with owner/member/admin permission checks in a focused service layer. Mobile adds typed family API wrappers and Expo Router screens for family list, create/join flows, overview-first family detail, member management, sharing personal recipes, and family recipe browsing. Tests drive backend permissions and shared recipe behavior first, then mobile is verified by TypeScript and manual flows.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, pytest, React Native, Expo Router, TypeScript, TanStack Query, Zod.

---

## Spec Source

Implement the approved design at `docs/superpowers/specs/2026-07-15-recipe-family-app-families-design.md`.

Key decisions:

- Support multiple families.
- Family tab lists families and opens a family detail overview.
- Sharing is initiated from family detail through “share my recipe”.
- Mobile includes admin invite refresh and member removal controls.
- Family recipe detail is read-only for this milestone; ordering belongs to Milestone 5.

## Target File Structure

Backend files:

```text
backend/app/models/family.py
backend/app/models/family_member.py
backend/app/models/family_recipe.py
backend/alembic/versions/20260715_0003_create_families.py
backend/app/schemas/family.py
backend/app/services/family_service.py
backend/app/api/v1/families.py
backend/app/tests/test_families_api.py
backend/app/tests/test_family_recipes_api.py
```

Mobile files:

```text
mobile/src/features/families/types.ts
mobile/src/features/families/schemas.ts
mobile/src/api/families.ts
mobile/app/(tabs)/family.tsx
mobile/app/families/new.tsx
mobile/app/families/join.tsx
mobile/app/families/[id].tsx
mobile/app/families/[id]/members.tsx
mobile/app/families/[id]/recipes.tsx
mobile/app/families/[id]/share-recipe.tsx
```

Documentation:

```text
README.md
```

---

### Task 1: Backend Family Models and Migration

**Files:**
- Create: `backend/app/models/family.py`
- Create: `backend/app/models/family_member.py`
- Create: `backend/app/models/family_recipe.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/20260715_0003_create_families.py`
- Test: `backend/app/tests/test_families_api.py`

- [ ] **Step 1: Write the failing model metadata test**

Create `backend/app/tests/test_families_api.py` with:

```python
from app.models import Base


def test_family_tables_are_registered() -> None:
    assert {"families", "family_members", "family_recipes"} <= set(Base.metadata.tables)
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_families_api.py::test_family_tables_are_registered -v
```

Expected: FAIL because the family models do not exist or are not registered.

- [ ] **Step 3: Create `backend/app/models/family.py`**

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.family_member import FamilyMember
    from app.models.family_recipe import FamilyRecipe


class Family(Base):
    __tablename__ = "families"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    avatar_image_id: Mapped[int | None] = mapped_column(ForeignKey("images.id"), nullable=True)
    cover_image_id: Mapped[int | None] = mapped_column(ForeignKey("images.id"), nullable=True)
    invite_code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    invite_code_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    theme_config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    members: Mapped[list["FamilyMember"]] = relationship(
        back_populates="family", cascade="all, delete-orphan"
    )
    family_recipes: Mapped[list["FamilyRecipe"]] = relationship(
        back_populates="family", cascade="all, delete-orphan"
    )
```

- [ ] **Step 4: Create `backend/app/models/family_member.py`**

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.family import Family
    from app.models.user import User


class FamilyMember(Base):
    __tablename__ = "family_members"
    __table_args__ = (UniqueConstraint("family_id", "user_id", name="uq_family_members_family_user"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="member", index=True)
    nickname_in_family: Mapped[str | None] = mapped_column(String(80), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)

    family: Mapped["Family"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()
```

- [ ] **Step 5: Create `backend/app/models/family_recipe.py`**

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.family import Family
    from app.models.recipe import Recipe
    from app.models.user import User


class FamilyRecipe(Base):
    __tablename__ = "family_recipes"
    __table_args__ = (UniqueConstraint("family_id", "recipe_id", name="uq_family_recipes_family_recipe"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shared_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)

    family: Mapped["Family"] = relationship(back_populates="family_recipes")
    recipe: Mapped["Recipe"] = relationship()
    shared_by: Mapped["User"] = relationship()
```

- [ ] **Step 6: Replace `backend/app/models/__init__.py`**

```python
from app.core.base import Base
from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.family_recipe import FamilyRecipe
from app.models.image import Image
from app.models.recipe import Recipe
from app.models.recipe_step import RecipeStep
from app.models.user import User
from app.models.user_settings import UserSettings

__all__ = [
    "Base",
    "Family",
    "FamilyMember",
    "FamilyRecipe",
    "Image",
    "Recipe",
    "RecipeStep",
    "User",
    "UserSettings",
]
```

- [ ] **Step 7: Create `backend/alembic/versions/20260715_0003_create_families.py`**

```python
"""create families

Revision ID: 20260715_0003
Revises: 20260715_0002
Create Date: 2026-07-15

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260715_0003"
down_revision: str | None = "20260715_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "families",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("avatar_image_id", sa.Integer(), nullable=True),
        sa.Column("cover_image_id", sa.Integer(), nullable=True),
        sa.Column("invite_code", sa.String(length=32), nullable=False),
        sa.Column("invite_code_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("theme_config", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["avatar_image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["cover_image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invite_code"),
    )
    op.create_index(op.f("ix_families_id"), "families", ["id"], unique=False)
    op.create_index(op.f("ix_families_invite_code"), "families", ["invite_code"], unique=False)
    op.create_index(op.f("ix_families_name"), "families", ["name"], unique=False)
    op.create_index(op.f("ix_families_owner_user_id"), "families", ["owner_user_id"], unique=False)

    op.create_table(
        "family_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("family_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("nickname_in_family", sa.String(length=80), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("family_id", "user_id", name="uq_family_members_family_user"),
    )
    op.create_index(op.f("ix_family_members_family_id"), "family_members", ["family_id"], unique=False)
    op.create_index(op.f("ix_family_members_id"), "family_members", ["id"], unique=False)
    op.create_index(op.f("ix_family_members_role"), "family_members", ["role"], unique=False)
    op.create_index(op.f("ix_family_members_status"), "family_members", ["status"], unique=False)
    op.create_index(op.f("ix_family_members_user_id"), "family_members", ["user_id"], unique=False)

    op.create_table(
        "family_recipes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("family_id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("shared_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shared_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("family_id", "recipe_id", name="uq_family_recipes_family_recipe"),
    )
    op.create_index(op.f("ix_family_recipes_family_id"), "family_recipes", ["family_id"], unique=False)
    op.create_index(op.f("ix_family_recipes_id"), "family_recipes", ["id"], unique=False)
    op.create_index(op.f("ix_family_recipes_recipe_id"), "family_recipes", ["recipe_id"], unique=False)
    op.create_index(op.f("ix_family_recipes_shared_by_user_id"), "family_recipes", ["shared_by_user_id"], unique=False)
    op.create_index(op.f("ix_family_recipes_status"), "family_recipes", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_family_recipes_status"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_shared_by_user_id"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_recipe_id"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_id"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_family_id"), table_name="family_recipes")
    op.drop_table("family_recipes")
    op.drop_index(op.f("ix_family_members_user_id"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_status"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_role"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_id"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_family_id"), table_name="family_members")
    op.drop_table("family_members")
    op.drop_index(op.f("ix_families_owner_user_id"), table_name="families")
    op.drop_index(op.f("ix_families_name"), table_name="families")
    op.drop_index(op.f("ix_families_invite_code"), table_name="families")
    op.drop_index(op.f("ix_families_id"), table_name="families")
    op.drop_table("families")
```

- [ ] **Step 8: Run the metadata test**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_families_api.py::test_family_tables_are_registered -v
```

Expected: PASS.

---

### Task 2: Backend Family Schemas, Service, and Routes

**Files:**
- Create: `backend/app/schemas/family.py`
- Create: `backend/app/services/family_service.py`
- Create: `backend/app/api/v1/families.py`
- Modify: `backend/app/main.py`
- Test: `backend/app/tests/test_families_api.py`

- [ ] **Step 1: Replace `backend/app/tests/test_families_api.py` with failing API tests**

```python
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
```

- [ ] **Step 2: Run the tests to verify route failure**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_families_api.py -v
```

Expected: FAIL with 404 responses for `/api/v1/families` endpoints.

- [ ] **Step 3: Create `backend/app/schemas/family.py`**

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.recipe import RecipeRead


class FamilyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class FamilyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None


class FamilyJoin(BaseModel):
    invite_code: str = Field(min_length=1, max_length=32)


class FamilyRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    owner_user_id: int
    avatar_image_id: int | None = None
    cover_image_id: int | None = None
    invite_code: str
    role: str
    member_count: int
    recipe_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FamilyMemberRead(BaseModel):
    id: int
    user_id: int
    nickname: str
    avatar_image_id: int | None = None
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FamilyRecipeCreate(BaseModel):
    recipe_id: int = Field(gt=0)


class FamilyRecipeRead(BaseModel):
    id: int
    family_id: int
    recipe_id: int
    shared_by_user_id: int
    shared_by_nickname: str
    recipe: RecipeRead
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 4: Create `backend/app/services/family_service.py`**

```python
from secrets import token_urlsafe

from sqlalchemy import Select, and_, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Family, FamilyMember, FamilyRecipe, Recipe, User
from app.schemas.family import FamilyCreate, FamilyJoin, FamilyUpdate


class NotFoundError(ValueError):
    pass


class PermissionDeniedError(ValueError):
    pass


class BadRequestError(ValueError):
    pass


def _generate_invite_code() -> str:
    return token_urlsafe(8).replace("-", "").replace("_", "")[:12].upper()


def _unique_invite_code(db: Session) -> str:
    for _ in range(20):
        code = _generate_invite_code()
        if db.scalar(select(Family.id).where(Family.invite_code == code)) is None:
            return code
    raise RuntimeError("Could not generate unique invite code")


def _active_member_statement(family_id: int, user_id: int) -> Select[tuple[FamilyMember]]:
    return select(FamilyMember).where(
        FamilyMember.family_id == family_id,
        FamilyMember.user_id == user_id,
        FamilyMember.status == "active",
    )


def get_active_member(db: Session, family_id: int, user: User) -> FamilyMember:
    member = db.scalar(_active_member_statement(family_id, user.id))
    if member is None:
        raise NotFoundError("Family not found")
    return member


def require_admin(db: Session, family_id: int, user: User) -> FamilyMember:
    member = get_active_member(db, family_id, user)
    if member.role != "admin":
        raise PermissionDeniedError("Admin permission required")
    return member


def _family_recipe_count(db: Session, family_id: int) -> int:
    return db.scalar(
        select(func.count(FamilyRecipe.id)).where(
            FamilyRecipe.family_id == family_id, FamilyRecipe.status == "active"
        )
    ) or 0


def _family_member_count(db: Session, family_id: int) -> int:
    return db.scalar(
        select(func.count(FamilyMember.id)).where(
            FamilyMember.family_id == family_id, FamilyMember.status == "active"
        )
    ) or 0


def family_payload(db: Session, family: Family, role: str) -> dict:
    return {
        "id": family.id,
        "name": family.name,
        "description": family.description,
        "owner_user_id": family.owner_user_id,
        "avatar_image_id": family.avatar_image_id,
        "cover_image_id": family.cover_image_id,
        "invite_code": family.invite_code,
        "role": role,
        "member_count": _family_member_count(db, family.id),
        "recipe_count": _family_recipe_count(db, family.id),
        "created_at": family.created_at,
        "updated_at": family.updated_at,
    }


def create_family(db: Session, user: User, request: FamilyCreate) -> dict:
    family = Family(
        name=request.name,
        description=request.description,
        owner_user_id=user.id,
        invite_code=_unique_invite_code(db),
        theme_config={},
    )
    db.add(family)
    db.flush()
    db.add(FamilyMember(family_id=family.id, user_id=user.id, role="admin", status="active"))
    db.commit()
    db.refresh(family)
    return family_payload(db, family, "admin")


def list_my_families(db: Session, user: User) -> list[dict]:
    statement = (
        select(Family, FamilyMember.role)
        .join(FamilyMember, FamilyMember.family_id == Family.id)
        .where(FamilyMember.user_id == user.id, FamilyMember.status == "active")
        .order_by(FamilyMember.joined_at.desc(), Family.id.desc())
    )
    return [family_payload(db, family, role) for family, role in db.execute(statement).all()]


def get_family(db: Session, user: User, family_id: int) -> dict:
    member = get_active_member(db, family_id, user)
    family = db.get(Family, family_id)
    if family is None:
        raise NotFoundError("Family not found")
    return family_payload(db, family, member.role)


def update_family(db: Session, user: User, family_id: int, request: FamilyUpdate) -> dict:
    admin = require_admin(db, family_id, user)
    family = db.get(Family, family_id)
    if family is None:
        raise NotFoundError("Family not found")
    update_data = request.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(family, field_name, value)
    db.commit()
    db.refresh(family)
    return family_payload(db, family, admin.role)


def join_family(db: Session, user: User, request: FamilyJoin) -> dict:
    family = db.scalar(select(Family).where(Family.invite_code == request.invite_code.strip().upper()))
    if family is None:
        raise NotFoundError("Invite code not found")
    member = db.scalar(select(FamilyMember).where(FamilyMember.family_id == family.id, FamilyMember.user_id == user.id))
    if member is None:
        member = FamilyMember(family_id=family.id, user_id=user.id, role="member", status="active")
        db.add(member)
    else:
        member.status = "active"
        if member.role not in {"admin", "member"}:
            member.role = "member"
    db.commit()
    db.refresh(family)
    db.refresh(member)
    return family_payload(db, family, member.role)


def refresh_invite_code(db: Session, user: User, family_id: int) -> dict:
    admin = require_admin(db, family_id, user)
    family = db.get(Family, family_id)
    if family is None:
        raise NotFoundError("Family not found")
    family.invite_code = _unique_invite_code(db)
    db.commit()
    db.refresh(family)
    return family_payload(db, family, admin.role)


def list_family_members(db: Session, user: User, family_id: int) -> list[dict]:
    get_active_member(db, family_id, user)
    statement = (
        select(FamilyMember)
        .options(selectinload(FamilyMember.user))
        .where(FamilyMember.family_id == family_id, FamilyMember.status == "active")
        .order_by(FamilyMember.role, FamilyMember.joined_at)
    )
    members = db.scalars(statement).all()
    return [
        {
            "id": member.id,
            "user_id": member.user_id,
            "nickname": member.nickname_in_family or member.user.nickname,
            "avatar_image_id": member.user.avatar_image_id,
            "role": member.role,
            "joined_at": member.joined_at,
        }
        for member in members
    ]


def remove_family_member(db: Session, user: User, family_id: int, target_user_id: int) -> None:
    require_admin(db, family_id, user)
    if target_user_id == user.id:
        raise BadRequestError("Admin cannot remove self")
    target = db.scalar(_active_member_statement(family_id, target_user_id))
    if target is None:
        raise NotFoundError("Member not found")
    if target.role == "admin":
        raise BadRequestError("Cannot remove admin member")
    target.status = "removed"
    db.commit()
```

- [ ] **Step 5: Create `backend/app/api/v1/families.py`**

```python
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.family import FamilyCreate, FamilyJoin, FamilyMemberRead, FamilyRead, FamilyUpdate
from app.services.family_service import (
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    create_family,
    get_family,
    join_family,
    list_family_members,
    list_my_families,
    refresh_invite_code,
    remove_family_member,
    update_family,
)

router = APIRouter(prefix="/families", tags=["families"])


def _map_service_error(exc: ValueError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, PermissionDeniedError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if isinstance(exc, BadRequestError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[FamilyRead])
def list_families(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[FamilyRead]:
    return list_my_families(db, current_user)


@router.post("", response_model=FamilyRead, status_code=status.HTTP_201_CREATED)
def create_family_endpoint(
    request: FamilyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    return create_family(db, current_user, request)


@router.post("/join", response_model=FamilyRead)
def join_family_endpoint(
    request: FamilyJoin,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return join_family(db, current_user, request)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.get("/{family_id}", response_model=FamilyRead)
def get_family_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return get_family(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.patch("/{family_id}", response_model=FamilyRead)
def update_family_endpoint(
    family_id: int,
    request: FamilyUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return update_family(db, current_user, family_id, request)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/{family_id}/invite-code/refresh", response_model=FamilyRead)
def refresh_invite_code_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return refresh_invite_code(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.get("/{family_id}/members", response_model=list[FamilyMemberRead])
def list_family_members_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[FamilyMemberRead]:
    try:
        return list_family_members(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.delete("/{family_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_family_member_endpoint(
    family_id: int,
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        remove_family_member(db, current_user, family_id, user_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 6: Modify `backend/app/main.py` to register the family router**

Add this import:

```python
from app.api.v1.families import router as families_router
```

Add this router registration after the existing recipe/upload/user routers:

```python
    app.include_router(families_router, prefix=settings.api_v1_prefix)
```

- [ ] **Step 7: Run family API tests**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_families_api.py -v
```

Expected: all family API tests pass.

---

### Task 3: Backend Family Recipe Sharing API

**Files:**
- Modify: `backend/app/services/family_service.py`
- Modify: `backend/app/api/v1/families.py`
- Test: `backend/app/tests/test_family_recipes_api.py`

- [ ] **Step 1: Create failing family recipe API tests**

Create `backend/app/tests/test_family_recipes_api.py` with:

```python
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
```

- [ ] **Step 2: Run tests to verify family recipe route failure**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_family_recipes_api.py -v
```

Expected: FAIL with 404 responses for `/api/v1/families/{family_id}/recipes` endpoints.

- [ ] **Step 3: Add family recipe service functions to `backend/app/services/family_service.py`**

Append this code to the file:

```python

def _active_recipe_for_owner_statement(user: User, recipe_id: int) -> Select[tuple[Recipe]]:
    return (
        select(Recipe)
        .options(selectinload(Recipe.steps), selectinload(Recipe.main_image))
        .where(Recipe.id == recipe_id, Recipe.owner_user_id == user.id, Recipe.status == "active")
    )


def _family_recipe_payload(family_recipe: FamilyRecipe) -> dict:
    return {
        "id": family_recipe.id,
        "family_id": family_recipe.family_id,
        "recipe_id": family_recipe.recipe_id,
        "shared_by_user_id": family_recipe.shared_by_user_id,
        "shared_by_nickname": family_recipe.shared_by.nickname,
        "recipe": family_recipe.recipe,
        "created_at": family_recipe.created_at,
    }


def list_family_recipes(db: Session, user: User, family_id: int) -> list[dict]:
    get_active_member(db, family_id, user)
    statement = (
        select(FamilyRecipe)
        .options(
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.steps),
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.main_image),
            selectinload(FamilyRecipe.shared_by),
        )
        .join(Recipe, Recipe.id == FamilyRecipe.recipe_id)
        .where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.status == "active",
            Recipe.status == "active",
        )
        .order_by(FamilyRecipe.created_at.desc(), FamilyRecipe.id.desc())
    )
    return [_family_recipe_payload(family_recipe) for family_recipe in db.scalars(statement).all()]


def share_recipe_to_family(db: Session, user: User, family_id: int, recipe_id: int) -> dict:
    get_active_member(db, family_id, user)
    recipe = db.scalars(_active_recipe_for_owner_statement(user, recipe_id)).first()
    if recipe is None:
        raise NotFoundError("Recipe not found")
    family_recipe = db.scalar(
        select(FamilyRecipe).where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.recipe_id == recipe_id,
        )
    )
    if family_recipe is None:
        family_recipe = FamilyRecipe(
            family_id=family_id,
            recipe_id=recipe_id,
            shared_by_user_id=user.id,
            status="active",
        )
        db.add(family_recipe)
    else:
        family_recipe.shared_by_user_id = user.id
        family_recipe.status = "active"
    db.commit()
    statement = (
        select(FamilyRecipe)
        .options(
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.steps),
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.main_image),
            selectinload(FamilyRecipe.shared_by),
        )
        .where(FamilyRecipe.id == family_recipe.id)
    )
    saved = db.scalar(statement)
    if saved is None:
        raise NotFoundError("Family recipe not found")
    return _family_recipe_payload(saved)


def remove_family_recipe(db: Session, user: User, family_id: int, recipe_id: int) -> None:
    member = get_active_member(db, family_id, user)
    family_recipe = db.scalar(
        select(FamilyRecipe)
        .options(selectinload(FamilyRecipe.recipe))
        .where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.recipe_id == recipe_id,
            FamilyRecipe.status == "active",
        )
    )
    if family_recipe is None:
        raise NotFoundError("Family recipe not found")
    if member.role != "admin" and family_recipe.recipe.owner_user_id != user.id:
        raise PermissionDeniedError("Cannot remove this family recipe")
    family_recipe.status = "removed"
    db.commit()
```

- [ ] **Step 4: Extend imports and routes in `backend/app/api/v1/families.py`**

Add these schema imports:

```python
from app.schemas.family import FamilyRecipeCreate, FamilyRecipeRead
```

Add these service imports:

```python
    list_family_recipes,
    remove_family_recipe,
    share_recipe_to_family,
```

Append these endpoints to the file:

```python

@router.get("/{family_id}/recipes", response_model=list[FamilyRecipeRead])
def list_family_recipes_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[FamilyRecipeRead]:
    try:
        return list_family_recipes(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/{family_id}/recipes", response_model=FamilyRecipeRead, status_code=status.HTTP_201_CREATED)
def share_recipe_to_family_endpoint(
    family_id: int,
    request: FamilyRecipeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRecipeRead:
    try:
        return share_recipe_to_family(db, current_user, family_id, request.recipe_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.delete("/{family_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_family_recipe_endpoint(
    family_id: int,
    recipe_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        remove_family_recipe(db, current_user, family_id, recipe_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 5: Run family recipe tests**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_family_recipes_api.py -v
```

Expected: all family recipe tests pass.

---

### Task 4: Mobile Types, Validation, and Family API Wrappers

**Files:**
- Replace: `mobile/src/features/families/types.ts`
- Create: `mobile/src/features/families/schemas.ts`
- Create: `mobile/src/api/families.ts`

- [ ] **Step 1: Replace `mobile/src/features/families/types.ts`**

```typescript
import { RecipeRead } from "@/features/recipes/types";

export type FamilyRole = "admin" | "member";

export type Family = {
  id: number;
  name: string;
  description: string | null;
  owner_user_id: number;
  avatar_image_id: number | null;
  cover_image_id: number | null;
  invite_code: string;
  role: FamilyRole;
  member_count: number;
  recipe_count: number;
  created_at: string;
  updated_at: string;
};

export type FamilyCreate = {
  name: string;
  description: string | null;
};

export type FamilyUpdate = Partial<FamilyCreate>;

export type FamilyJoin = {
  invite_code: string;
};

export type FamilyMember = {
  id: number;
  user_id: number;
  nickname: string;
  avatar_image_id: number | null;
  role: FamilyRole;
  joined_at: string;
};

export type FamilyRecipe = {
  id: number;
  family_id: number;
  recipe_id: number;
  shared_by_user_id: number;
  shared_by_nickname: string;
  recipe: RecipeRead;
  created_at: string;
};
```

- [ ] **Step 2: Create `mobile/src/features/families/schemas.ts`**

```typescript
import { z } from "zod";

import { FamilyCreate, FamilyJoin } from "./types";

export const familyFormSchema = z.object({
  name: z.string().trim().min(1, "请输入家庭名称").max(120, "家庭名称不能超过 120 个字符"),
  description: z.string().trim().optional()
});

export type FamilyFormValues = z.infer<typeof familyFormSchema>;

export function emptyFamilyForm(): FamilyFormValues {
  return { name: "", description: "" };
}

export function familyCreateFromForm(values: FamilyFormValues): FamilyCreate {
  return {
    name: values.name.trim(),
    description: values.description?.trim() ? values.description.trim() : null
  };
}

export const joinFamilySchema = z.object({
  invite_code: z.string().trim().min(1, "请输入邀请码").max(32, "邀请码不能超过 32 个字符")
});

export type JoinFamilyFormValues = z.infer<typeof joinFamilySchema>;

export function joinFamilyFromForm(values: JoinFamilyFormValues): FamilyJoin {
  return { invite_code: values.invite_code.trim().toUpperCase() };
}
```

- [ ] **Step 3: Create `mobile/src/api/families.ts`**

```typescript
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { Family, FamilyCreate, FamilyJoin, FamilyMember, FamilyRecipe, FamilyUpdate } from "@/features/families/types";

export function listFamilies(): Promise<Family[]> {
  return apiGet<Family[]>("/families", { auth: true });
}

export function createFamily(request: FamilyCreate): Promise<Family> {
  return apiPost<Family>("/families", request, { auth: true });
}

export function joinFamily(request: FamilyJoin): Promise<Family> {
  return apiPost<Family>("/families/join", request, { auth: true });
}

export function getFamily(id: number): Promise<Family> {
  return apiGet<Family>(`/families/${id}`, { auth: true });
}

export function updateFamily(id: number, request: FamilyUpdate): Promise<Family> {
  return apiPatch<Family>(`/families/${id}`, request, { auth: true });
}

export function refreshInviteCode(id: number): Promise<Family> {
  return apiPost<Family>(`/families/${id}/invite-code/refresh`, undefined, { auth: true });
}

export function listFamilyMembers(familyId: number): Promise<FamilyMember[]> {
  return apiGet<FamilyMember[]>(`/families/${familyId}/members`, { auth: true });
}

export function removeFamilyMember(familyId: number, userId: number): Promise<void> {
  return apiDelete<void>(`/families/${familyId}/members/${userId}`, { auth: true });
}

export function listFamilyRecipes(familyId: number): Promise<FamilyRecipe[]> {
  return apiGet<FamilyRecipe[]>(`/families/${familyId}/recipes`, { auth: true });
}

export function shareRecipeToFamily(familyId: number, recipeId: number): Promise<FamilyRecipe> {
  return apiPost<FamilyRecipe>(`/families/${familyId}/recipes`, { recipe_id: recipeId }, { auth: true });
}

export function removeFamilyRecipe(familyId: number, recipeId: number): Promise<void> {
  return apiDelete<void>(`/families/${familyId}/recipes/${recipeId}`, { auth: true });
}
```

- [ ] **Step 4: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

---

### Task 5: Mobile Family List, Create, and Join Screens

**Files:**
- Replace: `mobile/app/(tabs)/family.tsx`
- Create: `mobile/app/families/new.tsx`
- Create: `mobile/app/families/join.tsx`

- [ ] **Step 1: Replace `mobile/app/(tabs)/family.tsx`**

```tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { listFamilies } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { Family } from "@/features/families/types";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function FamilyScreen() {
  const { theme } = useAppTheme();
  const familiesQuery = useQuery({ queryKey: ["families"], queryFn: listFamilies });

  return (
    <AppScreen>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textColor }]}>家庭</Text>
        <View style={styles.headerActions}>
          <Link href="/families/join" asChild>
            <Pressable style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
              <Text style={{ color: theme.textColor }}>加入</Text>
            </Pressable>
          </Link>
          <Link href="/families/new" asChild>
            <Pressable style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
              <Text style={styles.primaryButtonText}>创建</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {familiesQuery.isLoading ? <ActivityIndicator /> : null}
      {familiesQuery.isError ? <Text style={{ color: theme.textColor }}>家庭加载失败，请稍后重试。</Text> : null}
      {familiesQuery.data?.length === 0 ? (
        <Text style={{ color: theme.mutedTextColor }}>创建或加入一个家庭，开始一起点菜。</Text>
      ) : null}

      {familiesQuery.data?.map((family: Family) => (
        <Link key={family.id} href={`/families/${family.id}`} asChild>
          <Pressable style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <Text style={[styles.cardTitle, { color: theme.textColor }]}>{family.name}</Text>
            {family.description ? <Text style={{ color: theme.mutedTextColor }}>{family.description}</Text> : null}
            <Text style={{ color: theme.mutedTextColor }}>
              {family.role === "admin" ? "管理员" : "成员"} · {family.member_count} 位成员 · {family.recipe_count} 道菜谱
            </Text>
          </Pressable>
        </Link>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  title: {
    fontSize: 24,
    fontWeight: "800"
  },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "800"
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800"
  }
});
```

- [ ] **Step 2: Create `mobile/app/families/new.tsx`**

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import { createFamily } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { emptyFamilyForm, familyCreateFromForm, familyFormSchema, FamilyFormValues } from "@/features/families/schemas";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function NewFamilyScreen() {
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FamilyFormValues>(emptyFamilyForm());
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: createFamily,
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      router.replace(`/families/${family.id}`);
    }
  });

  function submit(): void {
    const parsed = familyFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查家庭信息。");
      return;
    }
    setError(null);
    mutation.mutate(familyCreateFromForm(parsed.data));
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>创建家庭</Text>
      <TextInput
        placeholder="家庭名称"
        value={form.name}
        onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="简介，可选"
        value={form.description}
        onChangeText={(description) => setForm((current) => ({ ...current, description }))}
        multiline
        style={[styles.input, styles.multiline, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {mutation.isError ? <Text style={{ color: "#DC2626" }}>创建失败，请稍后重试。</Text> : null}
      <Pressable disabled={mutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{mutation.isPending ? "创建中..." : "创建家庭"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", borderRadius: 10, padding: 14 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
```

- [ ] **Step 3: Create `mobile/app/families/join.tsx`**

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import { joinFamily } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { joinFamilyFromForm, joinFamilySchema, JoinFamilyFormValues } from "@/features/families/schemas";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function JoinFamilyScreen() {
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<JoinFamilyFormValues>({ invite_code: "" });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: joinFamily,
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      router.replace(`/families/${family.id}`);
    }
  });

  function submit(): void {
    const parsed = joinFamilySchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查邀请码。");
      return;
    }
    setError(null);
    mutation.mutate(joinFamilyFromForm(parsed.data));
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>加入家庭</Text>
      <TextInput
        autoCapitalize="characters"
        placeholder="输入邀请码"
        value={form.invite_code}
        onChangeText={(invite_code) => setForm({ invite_code })}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {mutation.isError ? <Text style={{ color: "#DC2626" }}>加入失败，请确认邀请码是否正确。</Text> : null}
      <Pressable disabled={mutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{mutation.isPending ? "加入中..." : "加入家庭"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12 },
  primaryButton: { alignItems: "center", borderRadius: 10, padding: 14 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
```

- [ ] **Step 4: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

---

### Task 6: Mobile Family Detail and Members Screens

**Files:**
- Create: `mobile/app/families/[id].tsx`
- Create: `mobile/app/families/[id]/members.tsx`

- [ ] **Step 1: Create `mobile/app/families/[id].tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getFamily, refreshInviteCode } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function FamilyDetailScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const familyQuery = useQuery({
    queryKey: ["families", familyId],
    queryFn: () => getFamily(familyId ?? 0),
    enabled: familyId !== null
  });
  const refreshMutation = useMutation({
    mutationFn: () => refreshInviteCode(familyId ?? 0),
    onSuccess: async (family) => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", family.id] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (familyQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (familyQuery.isError || !familyQuery.data) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭不存在或加载失败。</Text></AppScreen>;
  }

  const family = familyQuery.data;
  const isAdmin = family.role === "admin";

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>{family.name}</Text>
      {family.description ? <Text style={{ color: theme.mutedTextColor }}>{family.description}</Text> : null}
      <View style={[styles.summaryCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
        <Text style={{ color: theme.mutedTextColor }}>我的角色：{isAdmin ? "管理员" : "成员"}</Text>
        <Text style={{ color: theme.mutedTextColor }}>成员：{family.member_count} 位</Text>
        <Text style={{ color: theme.mutedTextColor }}>共享菜谱：{family.recipe_count} 道</Text>
        <Text style={[styles.inviteCode, { color: theme.textColor }]}>邀请码：{family.invite_code}</Text>
      </View>

      {isAdmin ? (
        <Pressable disabled={refreshMutation.isPending} onPress={() => refreshMutation.mutate()} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
          <Text style={{ color: theme.textColor }}>{refreshMutation.isPending ? "刷新中..." : "刷新邀请码"}</Text>
        </Pressable>
      ) : null}
      {refreshMutation.isError ? <Text style={{ color: "#DC2626" }}>刷新邀请码失败。</Text> : null}

      <View style={styles.actions}>
        <Link href={`/families/${family.id}/members`} asChild>
          <Pressable style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
            <Text style={{ color: theme.textColor }}>成员</Text>
          </Pressable>
        </Link>
        <Link href={`/families/${family.id}/recipes`} asChild>
          <Pressable style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
            <Text style={{ color: theme.textColor }}>家庭菜谱</Text>
          </Pressable>
        </Link>
        <Link href={`/families/${family.id}/share-recipe`} asChild>
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.primaryButtonText}>共享我的菜谱</Text>
          </Pressable>
        </Link>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800" },
  summaryCard: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
  inviteCode: { fontSize: 18, fontWeight: "800" },
  actions: { gap: 10 },
  primaryButton: { alignItems: "center", borderRadius: 10, padding: 14 },
  primaryButtonText: { color: "white", fontWeight: "800" },
  secondaryButton: { alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 12 }
});
```

- [ ] **Step 2: Create `mobile/app/families/[id]/members.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getFamily, listFamilyMembers, removeFamilyMember } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { FamilyMember } from "@/features/families/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function FamilyMembersScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const familyQuery = useQuery({ queryKey: ["families", familyId], queryFn: () => getFamily(familyId ?? 0), enabled: familyId !== null });
  const membersQuery = useQuery({ queryKey: ["families", familyId, "members"], queryFn: () => listFamilyMembers(familyId ?? 0), enabled: familyId !== null });
  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeFamilyMember(familyId ?? 0, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId, "members"] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (familyQuery.isLoading || membersQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (familyQuery.isError || membersQuery.isError || !familyQuery.data) {
    return <AppScreen><Text style={{ color: theme.textColor }}>成员加载失败。</Text></AppScreen>;
  }

  const isAdmin = familyQuery.data.role === "admin";

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>家庭成员</Text>
      {membersQuery.data?.map((member: FamilyMember) => {
        const canRemove = isAdmin && member.role !== "admin";
        return (
          <View key={member.id} style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: theme.textColor }]}>{member.nickname}</Text>
              <Text style={{ color: theme.mutedTextColor }}>{member.role === "admin" ? "管理员" : "成员"}</Text>
            </View>
            {canRemove ? (
              <Pressable disabled={removeMutation.isPending} onPress={() => removeMutation.mutate(member.user_id)} style={[styles.dangerButton, { borderColor: "#DC2626" }]}>
                <Text style={{ color: "#DC2626" }}>移除</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {removeMutation.isError ? <Text style={{ color: "#DC2626" }}>移除成员失败。</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  card: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  memberInfo: { gap: 4 },
  memberName: { fontSize: 18, fontWeight: "800" },
  dangerButton: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 }
});
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

---

### Task 7: Mobile Family Recipes and Share Screens

**Files:**
- Create: `mobile/app/families/[id]/recipes.tsx`
- Create: `mobile/app/families/[id]/share-recipe.tsx`

- [ ] **Step 1: Create `mobile/app/families/[id]/recipes.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { imageUrlFromPublicUrl } from "@/api/imageUrls";
import { getFamily, listFamilyRecipes, removeFamilyRecipe } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { FamilyRecipe } from "@/features/families/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function FamilyRecipesScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const familyQuery = useQuery({ queryKey: ["families", familyId], queryFn: () => getFamily(familyId ?? 0), enabled: familyId !== null });
  const recipesQuery = useQuery({ queryKey: ["families", familyId, "recipes"], queryFn: () => listFamilyRecipes(familyId ?? 0), enabled: familyId !== null });
  const removeMutation = useMutation({
    mutationFn: (recipeId: number) => removeFamilyRecipe(familyId ?? 0, recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId, "recipes"] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (familyQuery.isLoading || recipesQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (familyQuery.isError || recipesQuery.isError || !familyQuery.data) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭菜谱加载失败。</Text></AppScreen>;
  }

  const isAdmin = familyQuery.data.role === "admin";

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>家庭菜谱</Text>
      {recipesQuery.data?.length === 0 ? <Text style={{ color: theme.mutedTextColor }}>还没有共享菜谱。</Text> : null}
      {recipesQuery.data?.map((item: FamilyRecipe) => {
        const imageUrl = imageUrlFromPublicUrl(item.recipe.main_image?.public_url);
        return (
          <View key={item.id} style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.recipeImage} /> : null}
            <Text style={[styles.recipeTitle, { color: theme.textColor }]}>{item.recipe.title}</Text>
            <Text style={{ color: theme.mutedTextColor }}>作者：{item.recipe.creator_name}</Text>
            <Text style={{ color: theme.mutedTextColor }}>由 {item.shared_by_nickname} 共享 · {item.recipe.steps.length} 个步骤</Text>
            {isAdmin ? (
              <Pressable disabled={removeMutation.isPending} onPress={() => removeMutation.mutate(item.recipe_id)} style={[styles.dangerButton, { borderColor: "#DC2626" }]}>
                <Text style={{ color: "#DC2626" }}>移除共享</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {removeMutation.isError ? <Text style={{ color: "#DC2626" }}>移除共享失败。</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  card: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
  recipeImage: { aspectRatio: 16 / 9, borderRadius: 10, width: "100%" },
  recipeTitle: { fontSize: 18, fontWeight: "800" },
  dangerButton: { alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 10 }
});
```

- [ ] **Step 2: Create `mobile/app/families/[id]/share-recipe.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { listFamilyRecipes, shareRecipeToFamily } from "@/api/families";
import { listRecipes } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { RecipeRead } from "@/features/recipes/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function ShareRecipeScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const myRecipesQuery = useQuery({ queryKey: ["recipes"], queryFn: listRecipes });
  const familyRecipesQuery = useQuery({ queryKey: ["families", familyId, "recipes"], queryFn: () => listFamilyRecipes(familyId ?? 0), enabled: familyId !== null });
  const shareMutation = useMutation({
    mutationFn: (recipeId: number) => shareRecipeToFamily(familyId ?? 0, recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId, "recipes"] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (myRecipesQuery.isLoading || familyRecipesQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (myRecipesQuery.isError || familyRecipesQuery.isError) {
    return <AppScreen><Text style={{ color: theme.textColor }}>菜谱加载失败。</Text></AppScreen>;
  }

  const sharedRecipeIds = new Set((familyRecipesQuery.data ?? []).map((item) => item.recipe_id));

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>共享我的菜谱</Text>
      {myRecipesQuery.data?.length === 0 ? <Text style={{ color: theme.mutedTextColor }}>你还没有可以共享的菜谱。</Text> : null}
      {myRecipesQuery.data?.map((recipe: RecipeRead) => {
        const isShared = sharedRecipeIds.has(recipe.id);
        return (
          <View key={recipe.id} style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <Text style={[styles.recipeTitle, { color: theme.textColor }]}>{recipe.title}</Text>
            <Text style={{ color: theme.mutedTextColor }}>{recipe.steps.length} 个步骤</Text>
            <Pressable
              disabled={isShared || shareMutation.isPending}
              onPress={() => shareMutation.mutate(recipe.id)}
              style={[styles.primaryButton, { backgroundColor: isShared ? theme.borderColor : theme.primaryColor }]}
            >
              <Text style={styles.primaryButtonText}>{isShared ? "已共享" : "共享到家庭"}</Text>
            </Pressable>
          </View>
        );
      })}
      {shareMutation.isError ? <Text style={{ color: "#DC2626" }}>共享失败，请稍后重试。</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  card: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
  recipeTitle: { fontSize: 18, fontWeight: "800" },
  primaryButton: { alignItems: "center", borderRadius: 10, padding: 12 },
  primaryButtonText: { color: "white", fontWeight: "800" }
});
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

---

### Task 8: README Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append milestone 4 verification to `README.md`**

Append this section:

```markdown
## Family Milestone Verification

Backend family checks:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_families_api.py app/tests/test_family_recipes_api.py -v
```

Expected result: family, member permission, invite-code, and shared recipe tests pass.

Full backend regression:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected result: all backend tests pass.

Mobile typecheck:

```bash
cd mobile
npm run typecheck
```

Expected result: TypeScript reports zero errors.

Manual family flow:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. User A registers or logs in.
4. User A creates a family.
5. User A copies the invite code from family detail.
6. User B registers or logs in.
7. User B joins the family with the invite code.
8. User A creates a recipe if needed.
9. User A opens family detail and shares the recipe.
10. User B opens family recipes and sees the shared recipe.
11. User B cannot see member removal controls.
12. User A opens members and removes User B.
```

- [ ] **Step 2: Run family backend tests**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_families_api.py app/tests/test_family_recipes_api.py -v
```

Expected: all milestone 4 backend tests pass.

- [ ] **Step 3: Run full backend regression**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest -v
```

Expected: all backend tests pass.

- [ ] **Step 4: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

---

## Final Verification

Run these commands after all tasks are complete:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_families_api.py app/tests/test_family_recipes_api.py -v
```

Expected: family milestone tests pass.

```bash
cd backend
.venv/Scripts/python.exe -m pytest -v
```

Expected: all backend tests pass.

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

## Spec Coverage Review

This plan implements:

- Multiple-family support.
- Create family.
- Join family by invite code.
- Family list and overview-first family detail.
- Family member list.
- Admin invite refresh.
- Admin removal of ordinary members.
- Ordinary member restriction from member removal.
- Family recipe sharing from family detail context.
- Family recipe list.
- Shared recipe removal by admin through mobile and by owner/admin through backend API.
- Backend permission checks for members, admins, non-members, recipe owners, and shared recipe removals.
- README milestone verification documentation.

This plan intentionally excludes ordering, task lists, app notifications, local reminders, family theme editing, family cover/avatar upload UI, family dissolution, admin transfer, and family recipe approval workflows.
