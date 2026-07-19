# Milestone 3 Recipes and Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 3: authenticated recipe CRUD, recipe step management, local image uploads, mobile recipe/image API wrappers, and mobile list/detail/new/edit recipe screens.

**Architecture:** Backend adds SQLAlchemy models registered through `app.core.base.Base`, Alembic schema, Pydantic schemas, service functions, authenticated FastAPI routes using `get_current_user`, and local filesystem image serving under `/static/uploads`. Mobile adds typed wrappers around the existing API client (`apiGet`, `apiPost`, `apiPatch`, `ApiError`), a multipart image upload helper, Zod form validation, and Expo Router recipe screens that use TanStack Query.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, python-multipart, local filesystem storage, pytest, React Native, Expo Router, TypeScript, TanStack Query, Expo Image Picker, Zod.

---

## File Structure

Backend files:

- Create `backend/app/models/image.py`: image metadata table.
- Create `backend/app/models/recipe.py`: recipe table and ordered relationship to steps.
- Create `backend/app/models/recipe_step.py`: recipe step table.
- Replace `backend/app/models/__init__.py`: export new models so Alembic and tests load metadata.
- Create `backend/alembic/versions/20260715_0002_create_images_and_recipes.py`: database migration.
- Create `backend/app/schemas/image.py`: image response schema.
- Create `backend/app/schemas/recipe.py`: recipe request/response schemas.
- Create `backend/app/services/image_service.py`: validate and persist uploaded images.
- Create `backend/app/services/recipe_service.py`: owner-scoped recipe CRUD and soft delete.
- Create `backend/app/api/v1/uploads.py`: authenticated local image upload endpoint.
- Create `backend/app/api/v1/recipes.py`: authenticated recipe CRUD endpoints.
- Modify `backend/app/main.py`: register routers and mount local uploads.
- Create `backend/app/tests/test_images.py`: upload endpoint tests.
- Create `backend/app/tests/test_recipes_api.py`: recipe CRUD endpoint tests.

Mobile files:

- Replace `mobile/src/features/recipes/types.ts`: backend-aligned recipe and image types.
- Create `mobile/src/features/recipes/schemas.ts`: Zod form validation and form helpers.
- Modify `mobile/src/api/client.ts`: add `apiDelete` using the existing request path.
- Create `mobile/src/api/images.ts`: multipart upload wrapper.
- Create `mobile/src/api/recipes.ts`: recipe CRUD wrappers.
- Replace `mobile/app/(tabs)/recipes.tsx`: recipe list tab.
- Create `mobile/app/recipes/[id].tsx`: recipe detail screen.
- Create `mobile/app/recipes/new.tsx`: new recipe screen.
- Create `mobile/app/recipes/edit.tsx`: edit recipe screen.

Documentation:

- Modify `README.md`: append Recipe Milestone Verification commands and manual flow.

---

### Task 1: Backend Models and Migration

**Files:**
- Create: `backend/app/models/image.py`
- Create: `backend/app/models/recipe.py`
- Create: `backend/app/models/recipe_step.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/20260715_0002_create_images_and_recipes.py`
- Test: `backend/app/tests/test_recipes_api.py`

- [ ] **Step 1: Create `backend/app/models/image.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    storage_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    object_key: Mapped[str] = mapped_column(String(512), nullable=False)
    public_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)
    width: Mapped[int | None] = mapped_column(nullable=True)
    height: Mapped[int | None] = mapped_column(nullable=True)
    purpose: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 2: Create `backend/app/models/recipe.py`**

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.recipe_step import RecipeStep


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    creator_name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    main_image_id: Mapped[int | None] = mapped_column(ForeignKey("images.id"), nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    steps: Mapped[list["RecipeStep"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeStep.step_no",
    )
```

- [ ] **Step 3: Create `backend/app/models/recipe_step.py`**

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.recipe import Recipe


class RecipeStep(Base):
    __tablename__ = "recipe_steps"
    __table_args__ = (UniqueConstraint("recipe_id", "step_no", name="uq_recipe_steps_recipe_step_no"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_no: Mapped[int] = mapped_column(nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    image_id: Mapped[int | None] = mapped_column(ForeignKey("images.id"), nullable=True)
    estimated_minutes: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    recipe: Mapped["Recipe"] = relationship(back_populates="steps")
```

- [ ] **Step 4: Replace `backend/app/models/__init__.py`**

```python
from app.core.base import Base
from app.models.image import Image
from app.models.recipe import Recipe
from app.models.recipe_step import RecipeStep
from app.models.user import User
from app.models.user_settings import UserSettings

__all__ = ["Base", "Image", "Recipe", "RecipeStep", "User", "UserSettings"]
```

- [ ] **Step 5: Create `backend/alembic/versions/20260715_0002_create_images_and_recipes.py`**

```python
"""create images and recipes

Revision ID: 20260715_0002
Revises: 20260715_0001
Create Date: 2026-07-15

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260715_0002"
down_revision: str | None = "20260715_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("storage_provider", sa.String(length=32), nullable=False),
        sa.Column("bucket", sa.String(length=255), nullable=True),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("public_url", sa.String(length=1024), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_images_id"), "images", ["id"], unique=False)
    op.create_index(op.f("ix_images_owner_user_id"), "images", ["owner_user_id"], unique=False)

    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("creator_name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("main_image_id", sa.Integer(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["main_image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recipes_id"), "recipes", ["id"], unique=False)
    op.create_index(op.f("ix_recipes_owner_user_id"), "recipes", ["owner_user_id"], unique=False)
    op.create_index(op.f("ix_recipes_status"), "recipes", ["status"], unique=False)
    op.create_index(op.f("ix_recipes_title"), "recipes", ["title"], unique=False)

    op.create_table(
        "recipe_steps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("step_no", sa.Integer(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("image_id", sa.Integer(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("recipe_id", "step_no", name="uq_recipe_steps_recipe_step_no"),
    )
    op.create_index(op.f("ix_recipe_steps_id"), "recipe_steps", ["id"], unique=False)
    op.create_index(op.f("ix_recipe_steps_recipe_id"), "recipe_steps", ["recipe_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_recipe_steps_recipe_id"), table_name="recipe_steps")
    op.drop_index(op.f("ix_recipe_steps_id"), table_name="recipe_steps")
    op.drop_table("recipe_steps")
    op.drop_index(op.f("ix_recipes_title"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_status"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_owner_user_id"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_id"), table_name="recipes")
    op.drop_table("recipes")
    op.drop_index(op.f("ix_images_owner_user_id"), table_name="images")
    op.drop_index(op.f("ix_images_id"), table_name="images")
    op.drop_table("images")
```

- [ ] **Step 6: Run model import verification**

Run:

```bash
cd backend
.venv/Scripts/python.exe -c "from app.models import Base, Image, Recipe, RecipeStep; print([{'images','recipes','recipe_steps'} <= set(Base.metadata.tables)])"
```

Expected output:

```text
[True]
```

---

### Task 2: Backend Image Upload Route

**Files:**
- Create: `backend/app/schemas/image.py`
- Create: `backend/app/services/image_service.py`
- Create: `backend/app/api/v1/uploads.py`
- Modify: `backend/app/main.py`
- Test: `backend/app/tests/test_images.py`

- [ ] **Step 1: Create `backend/app/tests/test_images.py`**

```python
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
    response = client.post(
        "/api/v1/uploads/images",
        headers=auth_headers(client),
        data={"purpose": "recipe_main"},
        files={"file": ("dish.jpg", b"fake image", "image/jpeg")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["purpose"] == "recipe_main"
    assert body["mime_type"] == "image/jpeg"
    assert body["size_bytes"] == 10
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
```

- [ ] **Step 2: Run upload tests and verify route failure**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_images.py -v
```

Expected output contains:

```text
FAILED app/tests/test_images.py::test_upload_image_creates_image_record
```

- [ ] **Step 3: Create `backend/app/schemas/image.py`**

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImageRead(BaseModel):
    id: int
    storage_provider: str
    object_key: str
    public_url: str
    mime_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    purpose: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 4: Create `backend/app/services/image_service.py`**

```python
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Image, User

ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _safe_suffix(filename: str | None, mime_type: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return suffix
    if mime_type == "image/png":
        return ".png"
    if mime_type == "image/webp":
        return ".webp"
    return ".jpg"


async def create_image_from_upload(db: Session, user: User, file: UploadFile, purpose: str) -> Image:
    if file.content_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValueError("Only JPEG, PNG, and WebP images are supported")
    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise ValueError("Image must be 5MB or smaller")
    normalized_purpose = purpose.strip() or "recipe_main"
    suffix = _safe_suffix(file.filename, file.content_type)
    object_key = f"{normalized_purpose}/{uuid4().hex}{suffix}"
    upload_root = Path(settings.local_upload_dir)
    target = upload_root / object_key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    public_url = f"/static/uploads/{object_key}"

    image = Image(
        owner_user_id=user.id,
        storage_provider="local",
        object_key=object_key,
        public_url=public_url,
        mime_type=file.content_type,
        size_bytes=len(content),
        purpose=normalized_purpose,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image
```

- [ ] **Step 5: Create `backend/app/api/v1/uploads.py`**

```python
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.image import ImageRead
from app.services.image_service import create_image_from_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/images", response_model=ImageRead, status_code=status.HTTP_201_CREATED)
async def upload_image(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    purpose: Annotated[str, Form()] = "recipe_main",
    file: Annotated[UploadFile, File()] = File(...),
) -> ImageRead:
    try:
        return await create_image_from_upload(db, current_user, file, purpose)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
```

- [ ] **Step 6: Replace `backend/app/main.py`**

```python
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    Path(settings.local_upload_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/static/uploads", StaticFiles(directory=settings.local_upload_dir), name="uploads")

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(users_router, prefix=settings.api_v1_prefix)
    app.include_router(uploads_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
```

- [ ] **Step 7: Run upload tests**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_images.py -v
```

Expected output contains:

```text
2 passed
```

---

### Task 3: Backend Recipe Schemas, Service, and API

**Files:**
- Create: `backend/app/schemas/recipe.py`
- Create: `backend/app/services/recipe_service.py`
- Create: `backend/app/api/v1/recipes.py`
- Modify: `backend/app/main.py`
- Test: `backend/app/tests/test_recipes_api.py`

- [ ] **Step 1: Create `backend/app/tests/test_recipes_api.py`**

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
```

- [ ] **Step 2: Run recipe API tests and verify route failure**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_recipes_api.py -v
```

Expected output contains:

```text
FAILED app/tests/test_recipes_api.py::test_create_list_detail_update_and_delete_recipe
```

- [ ] **Step 3: Create `backend/app/schemas/recipe.py`**

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RecipeStepCreate(BaseModel):
    step_no: int = Field(ge=1)
    instruction: str = Field(min_length=1)
    image_id: int | None = None
    estimated_minutes: int | None = Field(default=None, ge=0)


class RecipeStepRead(BaseModel):
    id: int
    step_no: int
    instruction: str
    image_id: int | None = None
    estimated_minutes: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecipeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    creator_name: str = Field(min_length=1, max_length=80)
    description: str | None = None
    main_image_id: int | None = None
    tags: list[str] = Field(default_factory=list)
    steps: list[RecipeStepCreate] = Field(min_length=1)


class RecipeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    creator_name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    main_image_id: int | None = None
    tags: list[str] | None = None
    steps: list[RecipeStepCreate] | None = None


class RecipeRead(BaseModel):
    id: int
    title: str
    creator_name: str
    description: str | None = None
    main_image_id: int | None = None
    tags: list[str]
    steps: list[RecipeStepRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 4: Create `backend/app/services/recipe_service.py`**

```python
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models import Recipe, RecipeStep, User
from app.schemas.recipe import RecipeCreate, RecipeUpdate


def _active_owned_recipe_statement(user: User, recipe_id: int) -> Select[tuple[Recipe]]:
    return (
        select(Recipe)
        .options(selectinload(Recipe.steps))
        .where(
            Recipe.id == recipe_id,
            Recipe.owner_user_id == user.id,
            Recipe.status == "active",
        )
    )


def _replace_steps(recipe: Recipe, steps: list[RecipeStep]) -> None:
    recipe.steps.clear()
    recipe.steps.extend(steps)


def _step_models(request_steps: list) -> list[RecipeStep]:
    return [
        RecipeStep(
            step_no=step.step_no,
            instruction=step.instruction,
            image_id=step.image_id,
            estimated_minutes=step.estimated_minutes,
        )
        for step in sorted(request_steps, key=lambda item: item.step_no)
    ]


def create_recipe(db: Session, user: User, request: RecipeCreate) -> Recipe:
    recipe = Recipe(
        owner_user_id=user.id,
        title=request.title,
        creator_name=request.creator_name,
        description=request.description,
        main_image_id=request.main_image_id,
        tags=request.tags,
        status="active",
    )
    _replace_steps(recipe, _step_models(request.steps))
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    db.refresh(recipe, attribute_names=["steps"])
    return recipe


def list_my_recipes(db: Session, user: User) -> list[Recipe]:
    statement = (
        select(Recipe)
        .options(selectinload(Recipe.steps))
        .where(Recipe.owner_user_id == user.id, Recipe.status == "active")
        .order_by(Recipe.created_at.desc(), Recipe.id.desc())
    )
    return list(db.scalars(statement).all())


def get_my_recipe(db: Session, user: User, recipe_id: int) -> Recipe:
    recipe = db.scalars(_active_owned_recipe_statement(user, recipe_id)).first()
    if recipe is None:
        raise ValueError("Recipe not found")
    return recipe


def update_recipe(db: Session, user: User, recipe_id: int, request: RecipeUpdate) -> Recipe:
    recipe = get_my_recipe(db, user, recipe_id)
    update_data = request.model_dump(exclude_unset=True)
    steps = update_data.pop("steps", None)
    for field_name, value in update_data.items():
        setattr(recipe, field_name, value)
    if steps is not None:
        _replace_steps(recipe, _step_models(request.steps or []))
    db.commit()
    db.refresh(recipe)
    db.refresh(recipe, attribute_names=["steps"])
    return recipe


def delete_recipe(db: Session, user: User, recipe_id: int) -> None:
    recipe = get_my_recipe(db, user, recipe_id)
    recipe.status = "deleted"
    db.commit()
```

- [ ] **Step 5: Create `backend/app/api/v1/recipes.py`**

```python
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.recipe import RecipeCreate, RecipeRead, RecipeUpdate
from app.services.recipe_service import (
    create_recipe,
    delete_recipe,
    get_my_recipe,
    list_my_recipes,
    update_recipe,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _not_found(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("", response_model=list[RecipeRead])
def list_recipes(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[RecipeRead]:
    return list_my_recipes(db, current_user)


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create_recipe_endpoint(
    request: RecipeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecipeRead:
    return create_recipe(db, current_user, request)


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe_endpoint(
    recipe_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecipeRead:
    try:
        return get_my_recipe(db, current_user, recipe_id)
    except ValueError as exc:
        raise _not_found(exc) from exc


@router.patch("/{recipe_id}", response_model=RecipeRead)
def update_recipe_endpoint(
    recipe_id: int,
    request: RecipeUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecipeRead:
    try:
        return update_recipe(db, current_user, recipe_id, request)
    except ValueError as exc:
        raise _not_found(exc) from exc


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe_endpoint(
    recipe_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        delete_recipe(db, current_user, recipe_id)
    except ValueError as exc:
        raise _not_found(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 6: Replace `backend/app/main.py`**

```python
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.recipes import router as recipes_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    Path(settings.local_upload_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/static/uploads", StaticFiles(directory=settings.local_upload_dir), name="uploads")

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(users_router, prefix=settings.api_v1_prefix)
    app.include_router(uploads_router, prefix=settings.api_v1_prefix)
    app.include_router(recipes_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
```

- [ ] **Step 7: Run recipe API tests**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_recipes_api.py -v
```

Expected output contains:

```text
2 passed
```

---

### Task 4: Mobile API Types, Validation, and Wrappers

**Files:**
- Modify: `mobile/src/features/recipes/types.ts`
- Create: `mobile/src/features/recipes/schemas.ts`
- Modify: `mobile/src/api/client.ts`
- Create: `mobile/src/api/images.ts`
- Create: `mobile/src/api/recipes.ts`

- [ ] **Step 1: Replace `mobile/src/features/recipes/types.ts`**

```typescript
export type ImageRead = {
  id: number;
  storage_provider: string;
  object_key: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  purpose: string;
  created_at: string;
};

export type RecipeStepRead = {
  id: number;
  step_no: number;
  instruction: string;
  image_id: number | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type RecipeStepCreate = {
  step_no: number;
  instruction: string;
  image_id: number | null;
  estimated_minutes: number | null;
};

export type RecipeRead = {
  id: number;
  title: string;
  creator_name: string;
  description: string | null;
  main_image_id: number | null;
  tags: string[];
  steps: RecipeStepRead[];
  created_at: string;
  updated_at: string;
};

export type RecipeCreate = {
  title: string;
  creator_name: string;
  description: string | null;
  main_image_id: number | null;
  tags: string[];
  steps: RecipeStepCreate[];
};

export type RecipeUpdate = Partial<RecipeCreate>;
```

- [ ] **Step 2: Create `mobile/src/features/recipes/schemas.ts`**

```typescript
import { z } from "zod";

import { RecipeCreate, RecipeStepCreate } from "./types";

export const recipeFormSchema = z.object({
  title: z.string().trim().min(1, "请输入菜谱名称").max(120, "菜谱名称不能超过 120 个字符"),
  creator_name: z.string().trim().min(1, "请输入作者").max(80, "作者不能超过 80 个字符"),
  description: z.string().trim().optional(),
  tags_text: z.string().trim().optional(),
  main_image_id: z.number().nullable(),
  steps: z.array(z.string().trim().min(1, "步骤不能为空")).min(1, "至少添加一个步骤")
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export function emptyRecipeForm(): RecipeFormValues {
  return {
    title: "",
    creator_name: "",
    description: "",
    tags_text: "",
    main_image_id: null,
    steps: [""]
  };
}

export function tagsFromText(tagsText: string | undefined): string[] {
  return (tagsText ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function stepsFromText(steps: string[]): RecipeStepCreate[] {
  return steps.map((instruction, index) => ({
    step_no: index + 1,
    instruction: instruction.trim(),
    image_id: null,
    estimated_minutes: null
  }));
}

export function recipeCreateFromForm(values: RecipeFormValues): RecipeCreate {
  return {
    title: values.title.trim(),
    creator_name: values.creator_name.trim(),
    description: values.description?.trim() ? values.description.trim() : null,
    main_image_id: values.main_image_id,
    tags: tagsFromText(values.tags_text),
    steps: stepsFromText(values.steps)
  };
}
```

- [ ] **Step 3: Replace `mobile/src/api/client.ts`**

```typescript
import Constants from "expo-constants";

import { getAccessToken } from "@/storage/tokenStorage";

const fallbackApiBaseUrl = "http://10.0.2.2:8000/api/v1";

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  fallbackApiBaseUrl;

type RequestOptions = {
  auth?: boolean;
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isAuthApiError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || `${method} ${path} failed with status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>("GET", path, options);
}

export function apiPost<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>("POST", path, { ...options, body });
}

export function apiPatch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>("PATCH", path, { ...options, body });
}

export function apiDelete<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>("DELETE", path, options);
}
```

- [ ] **Step 4: Create `mobile/src/api/images.ts`**

```typescript
import { ApiError, apiBaseUrl } from "./client";
import { ImageRead } from "@/features/recipes/types";
import { getAccessToken } from "@/storage/tokenStorage";

function filenameFromUri(uri: string): string {
  const pathPart = uri.split("?")[0] ?? uri;
  return pathPart.split("/").pop() || "recipe-image.jpg";
}

function mimeTypeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/jpeg";
}

export async function uploadImage(uri: string, purpose = "recipe_main"): Promise<ImageRead> {
  const token = await getAccessToken();
  const filename = filenameFromUri(uri);
  const formData = new FormData();
  formData.append("purpose", purpose);
  formData.append("file", {
    uri,
    name: filename,
    type: mimeTypeFromFilename(filename)
  } as unknown as Blob);

  const response = await fetch(`${apiBaseUrl}/uploads/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || `Image upload failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as ImageRead;
}
```

- [ ] **Step 5: Create `mobile/src/api/recipes.ts`**

```typescript
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { RecipeCreate, RecipeRead, RecipeUpdate } from "@/features/recipes/types";

export function listRecipes(): Promise<RecipeRead[]> {
  return apiGet<RecipeRead[]>("/recipes", { auth: true });
}

export function getRecipe(id: number): Promise<RecipeRead> {
  return apiGet<RecipeRead>(`/recipes/${id}`, { auth: true });
}

export function createRecipe(request: RecipeCreate): Promise<RecipeRead> {
  return apiPost<RecipeRead>("/recipes", request, { auth: true });
}

export function updateRecipe(id: number, request: RecipeUpdate): Promise<RecipeRead> {
  return apiPatch<RecipeRead>(`/recipes/${id}`, request, { auth: true });
}

export function deleteRecipe(id: number): Promise<void> {
  return apiDelete<void>(`/recipes/${id}`, { auth: true });
}
```

- [ ] **Step 6: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected output contains:

```text
Found 0 errors.
```

---

### Task 5: Mobile Recipe List and Detail Screens

**Files:**
- Modify: `mobile/app/(tabs)/recipes.tsx`
- Create: `mobile/app/recipes/[id].tsx`

- [ ] **Step 1: Replace `mobile/app/(tabs)/recipes.tsx`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { listRecipes } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function RecipesScreen() {
  const { theme } = useAppTheme();
  const recipesQuery = useQuery({ queryKey: ["recipes"], queryFn: listRecipes });

  return (
    <AppScreen>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textColor }]}>菜谱</Text>
        <Link href="/recipes/new" asChild>
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.primaryButtonText}>新建</Text>
          </Pressable>
        </Link>
      </View>

      {recipesQuery.isLoading ? <ActivityIndicator /> : null}
      {recipesQuery.isError ? <Text style={{ color: theme.textColor }}>菜谱加载失败，请稍后重试。</Text> : null}
      {recipesQuery.data?.length === 0 ? (
        <Text style={{ color: theme.mutedTextColor }}>还没有菜谱，点击新建记录第一道菜。</Text>
      ) : null}
      {recipesQuery.data?.map((recipe) => (
        <Link key={recipe.id} href={`/recipes/${recipe.id}`} asChild>
          <Pressable style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <Text style={[styles.cardTitle, { color: theme.textColor }]}>{recipe.title}</Text>
            <Text style={{ color: theme.mutedTextColor }}>作者：{recipe.creator_name}</Text>
            <Text style={{ color: theme.mutedTextColor }}>{recipe.steps.length} 个步骤</Text>
            {recipe.tags.length > 0 ? <Text style={{ color: theme.mutedTextColor }}>{recipe.tags.join(" · ")}</Text> : null}
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
  title: {
    fontSize: 24,
    fontWeight: "700"
  },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "700"
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700"
  }
});
```

- [ ] **Step 2: Create `mobile/app/recipes/[id].tsx`**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { deleteRecipe, getRecipe } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseRecipeId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const recipeId = parseRecipeId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const recipeQuery = useQuery({
    queryKey: ["recipes", recipeId],
    queryFn: () => getRecipe(recipeId ?? 0),
    enabled: recipeId !== null
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(recipeId ?? 0),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      router.replace("/(tabs)/recipes");
    }
  });

  if (recipeId === null) {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>菜谱 ID 无效。</Text>
      </AppScreen>
    );
  }

  if (recipeQuery.isLoading) {
    return (
      <AppScreen>
        <ActivityIndicator />
      </AppScreen>
    );
  }

  if (recipeQuery.isError || !recipeQuery.data) {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>菜谱不存在或加载失败。</Text>
      </AppScreen>
    );
  }

  const recipe = recipeQuery.data;

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>{recipe.title}</Text>
      <Text style={{ color: theme.mutedTextColor }}>作者：{recipe.creator_name}</Text>
      {recipe.description ? <Text style={{ color: theme.textColor }}>{recipe.description}</Text> : null}
      {recipe.tags.length > 0 ? <Text style={{ color: theme.mutedTextColor }}>{recipe.tags.join(" · ")}</Text> : null}

      <View style={styles.actions}>
        <Link href={`/recipes/edit?id=${recipe.id}`} asChild>
          <Pressable style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
            <Text style={{ color: theme.textColor }}>编辑</Text>
          </Pressable>
        </Link>
        <Pressable
          disabled={deleteMutation.isPending}
          onPress={() => deleteMutation.mutate()}
          style={[styles.dangerButton, { borderColor: "#DC2626" }]}
        >
          <Text style={{ color: "#DC2626" }}>{deleteMutation.isPending ? "删除中..." : "删除"}</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>步骤</Text>
      {recipe.steps.map((step) => (
        <View key={step.id} style={[styles.stepCard, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
          <Text style={[styles.stepNumber, { color: theme.primaryColor }]}>步骤 {step.step_no}</Text>
          <Text style={{ color: theme.textColor }}>{step.instruction}</Text>
          {step.estimated_minutes !== null ? <Text style={{ color: theme.mutedTextColor }}>{step.estimated_minutes} 分钟</Text> : null}
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  dangerButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  stepNumber: {
    fontWeight: "700"
  }
});
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected output contains:

```text
Found 0 errors.
```

---

### Task 6: Mobile New and Edit Recipe Screens

**Files:**
- Create: `mobile/app/recipes/new.tsx`
- Create: `mobile/app/recipes/edit.tsx`

- [ ] **Step 1: Create `mobile/app/recipes/new.tsx`**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { uploadImage } from "@/api/images";
import { createRecipe } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { emptyRecipeForm, recipeCreateFromForm, recipeFormSchema, RecipeFormValues } from "@/features/recipes/schemas";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function NewRecipeScreen() {
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RecipeFormValues>(emptyRecipeForm());
  const [error, setError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: async (recipe) => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      router.replace(`/recipes/${recipe.id}`);
    }
  });

  function updateStep(index: number, value: string): void {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? value : step))
    }));
  }

  async function pickImage(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("需要相册权限才能上传图片。");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled) {
      return;
    }
    const uploaded = await uploadImage(result.assets[0].uri, "recipe_main");
    setForm((current) => ({ ...current, main_image_id: uploaded.id }));
  }

  function submit(): void {
    const parsed = recipeFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查菜谱内容。");
      return;
    }
    setError(null);
    createMutation.mutate(recipeCreateFromForm(parsed.data));
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>新建菜谱</Text>
      <TextInput
        placeholder="菜谱名称"
        value={form.title}
        onChangeText={(title) => setForm((current) => ({ ...current, title }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="作者"
        value={form.creator_name}
        onChangeText={(creator_name) => setForm((current) => ({ ...current, creator_name }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="简介"
        value={form.description}
        onChangeText={(description) => setForm((current) => ({ ...current, description }))}
        multiline
        style={[styles.input, styles.multiline, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="标签，用英文逗号分隔"
        value={form.tags_text}
        onChangeText={(tags_text) => setForm((current) => ({ ...current, tags_text }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <Pressable onPress={pickImage} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
        <Text style={{ color: theme.textColor }}>{form.main_image_id ? "已上传主图，重新选择" : "选择主图"}</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>步骤</Text>
      {form.steps.map((step, index) => (
        <TextInput
          key={index}
          placeholder={`步骤 ${index + 1}`}
          value={step}
          onChangeText={(value) => updateStep(index, value)}
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
      ))}
      <View style={styles.actions}>
        <Pressable
          onPress={() => setForm((current) => ({ ...current, steps: [...current.steps, ""] }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>添加步骤</Text>
        </Pressable>
        <Pressable
          onPress={() => setForm((current) => ({ ...current, steps: current.steps.length > 1 ? current.steps.slice(0, -1) : current.steps }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>删除末尾步骤</Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {createMutation.isError ? <Text style={{ color: "#DC2626" }}>保存失败，请稍后重试。</Text> : null}
      <Pressable disabled={createMutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{createMutation.isPending ? "保存中..." : "保存菜谱"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "800"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 10,
    padding: 14
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "800"
  }
});
```

- [ ] **Step 2: Create `mobile/app/recipes/edit.tsx`**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { uploadImage } from "@/api/images";
import { getRecipe, updateRecipe } from "@/api/recipes";
import { AppScreen } from "@/components/AppScreen";
import { emptyRecipeForm, recipeCreateFromForm, recipeFormSchema, RecipeFormValues } from "@/features/recipes/schemas";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseRecipeId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams();
  const recipeId = parseRecipeId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RecipeFormValues>(emptyRecipeForm());
  const [error, setError] = useState<string | null>(null);
  const recipeQuery = useQuery({
    queryKey: ["recipes", recipeId],
    queryFn: () => getRecipe(recipeId ?? 0),
    enabled: recipeId !== null
  });
  const updateMutation = useMutation({
    mutationFn: (values: RecipeFormValues) => updateRecipe(recipeId ?? 0, recipeCreateFromForm(values)),
    onSuccess: async (recipe) => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      await queryClient.invalidateQueries({ queryKey: ["recipes", recipe.id] });
      router.replace(`/recipes/${recipe.id}`);
    }
  });

  useEffect(() => {
    if (!recipeQuery.data) {
      return;
    }
    setForm({
      title: recipeQuery.data.title,
      creator_name: recipeQuery.data.creator_name,
      description: recipeQuery.data.description ?? "",
      tags_text: recipeQuery.data.tags.join(", "),
      main_image_id: recipeQuery.data.main_image_id,
      steps: recipeQuery.data.steps.map((step) => step.instruction)
    });
  }, [recipeQuery.data]);

  function updateStep(index: number, value: string): void {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? value : step))
    }));
  }

  async function pickImage(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("需要相册权限才能上传图片。");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled) {
      return;
    }
    const uploaded = await uploadImage(result.assets[0].uri, "recipe_main");
    setForm((current) => ({ ...current, main_image_id: uploaded.id }));
  }

  function submit(): void {
    const parsed = recipeFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查菜谱内容。");
      return;
    }
    setError(null);
    updateMutation.mutate(parsed.data);
  }

  if (recipeId === null) {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>菜谱 ID 无效。</Text>
      </AppScreen>
    );
  }

  if (recipeQuery.isLoading) {
    return (
      <AppScreen>
        <ActivityIndicator />
      </AppScreen>
    );
  }

  if (recipeQuery.isError || !recipeQuery.data) {
    return (
      <AppScreen>
        <Text style={{ color: theme.textColor }}>菜谱不存在或加载失败。</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>编辑菜谱</Text>
      <TextInput
        placeholder="菜谱名称"
        value={form.title}
        onChangeText={(title) => setForm((current) => ({ ...current, title }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="作者"
        value={form.creator_name}
        onChangeText={(creator_name) => setForm((current) => ({ ...current, creator_name }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="简介"
        value={form.description}
        onChangeText={(description) => setForm((current) => ({ ...current, description }))}
        multiline
        style={[styles.input, styles.multiline, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <TextInput
        placeholder="标签，用英文逗号分隔"
        value={form.tags_text}
        onChangeText={(tags_text) => setForm((current) => ({ ...current, tags_text }))}
        style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
      />
      <Pressable onPress={pickImage} style={[styles.secondaryButton, { borderColor: theme.borderColor }]}>
        <Text style={{ color: theme.textColor }}>{form.main_image_id ? "已上传主图，重新选择" : "选择主图"}</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>步骤</Text>
      {form.steps.map((step, index) => (
        <TextInput
          key={index}
          placeholder={`步骤 ${index + 1}`}
          value={step}
          onChangeText={(value) => updateStep(index, value)}
          style={[styles.input, { borderColor: theme.borderColor, color: theme.textColor }]}
        />
      ))}
      <View style={styles.actions}>
        <Pressable
          onPress={() => setForm((current) => ({ ...current, steps: [...current.steps, ""] }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>添加步骤</Text>
        </Pressable>
        <Pressable
          onPress={() => setForm((current) => ({ ...current, steps: current.steps.length > 1 ? current.steps.slice(0, -1) : current.steps }))}
          style={[styles.secondaryButton, { borderColor: theme.borderColor }]}
        >
          <Text style={{ color: theme.textColor }}>删除末尾步骤</Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
      {updateMutation.isError ? <Text style={{ color: "#DC2626" }}>保存失败，请稍后重试。</Text> : null}
      <Pressable disabled={updateMutation.isPending} onPress={submit} style={[styles.primaryButton, { backgroundColor: theme.primaryColor }]}>
        <Text style={styles.primaryButtonText}>{updateMutation.isPending ? "保存中..." : "保存修改"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "800"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 10,
    padding: 14
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "800"
  }
});
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected output contains:

```text
Found 0 errors.
```

---

### Task 7: README Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append this exact section to `README.md`**

```markdown
## Recipe Milestone Verification

Backend recipe and image checks:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_images.py app/tests/test_recipes_api.py -v
```

Expected result: image upload tests and recipe CRUD tests pass.

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

Manual recipe flow:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. Register or log in.
4. Open 「菜谱」.
5. Tap 「新建」.
6. Select a recipe main image.
7. Enter title, author, description, comma-separated tags, and at least one step.
8. Save and confirm the app opens the recipe detail screen.
9. Return to 「菜谱」 and confirm the recipe appears in the list.
10. Open the recipe detail screen, tap 「编辑」, change the title or steps, and save.
11. Open the recipe detail screen again and delete the recipe.
12. Confirm the deleted recipe no longer appears in the list.
```

- [ ] **Step 2: Run backend tests**

Run:

```bash
cd backend
.venv/Scripts/python.exe -m pytest -v
```

Expected output ends with a passing pytest summary, for example:

```text
passed
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected output contains:

```text
Found 0 errors.
```

---

## Final Verification

Run these commands after all tasks are complete:

```bash
cd backend
.venv/Scripts/python.exe -m pytest app/tests/test_images.py app/tests/test_recipes_api.py -v
```

Expected output contains:

```text
passed
```

```bash
cd backend
.venv/Scripts/python.exe -m pytest -v
```

Expected output contains:

```text
passed
```

```bash
cd mobile
npm run typecheck
```

Expected output contains:

```text
Found 0 errors.
```

## Spec Coverage Review

This plan implements:

- Backend image metadata persistence.
- Authenticated local image upload at `POST /api/v1/uploads/images`.
- Backend recipe and recipe step persistence.
- Authenticated recipe create, list, detail, update, and soft delete routes.
- Recipe ownership enforcement through `get_current_user` and `owner_user_id` filters.
- Mobile image upload wrapper.
- Mobile recipe CRUD API wrappers.
- Mobile recipe list screen.
- Mobile recipe detail screen.
- Mobile new recipe screen with image picker upload.
- Mobile edit recipe screen with image picker upload.
- README verification documentation.

This plan intentionally excludes family recipe sharing, object storage providers, step image UI, multi-image galleries, and physical image garbage collection because those belong to later milestones.
