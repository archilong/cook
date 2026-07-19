# Recipe Family App Auth Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/phone password registration, login, authenticated current-user access, account profile editing, and mobile login-state persistence.

**Architecture:** Backend adds SQLAlchemy user/settings models, Alembic migration, password hashing, JWT creation/verification, auth dependencies, and REST endpoints. Mobile replaces placeholder auth screens with validated forms, stores access tokens in SecureStore, restores sessions on app startup, and protects tab navigation behind login. Account settings can edit nickname and avatar image id placeholder while image upload remains deferred to the image milestone.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, python-jose, passlib/bcrypt, pytest, React Native, Expo Router, TypeScript, TanStack Query, Zod, SecureStore.

---

## Scope Note

This plan implements **Milestone 2: Registration, Login, and Account Settings** from `docs/superpowers/specs/2026-07-15-recipe-family-app-design.md`.

Included:

- User model.
- User settings model.
- Auth and user schemas.
- Password hashing.
- JWT access token creation and verification.
- Current-user dependency.
- Register/login/logout/me APIs.
- Current-user profile and settings APIs.
- Mobile auth API wrappers.
- Mobile auth store.
- Login/register screens.
- Login-state restoration.
- Basic account/settings UI.

Deferred to later milestone plans:

- Real avatar image upload.
- Recipe CRUD.
- Family membership.
- Refresh tokens.
- SMS verification.
- Third-party OAuth.
- Password reset flow.

## Target File Structure

Create or modify this structure:

```text
backend/
  app/
    api/
      deps.py
      v1/
        auth.py
        users.py
    core/
      security.py
    models/
      user.py
      user_settings.py
    schemas/
      auth.py
      user.py
      user_settings.py
    services/
      auth_service.py
      user_service.py
    tests/
      test_auth.py
      test_users.py
  alembic/
    versions/
      20260715_0001_create_users_and_settings.py
mobile/
  app/
    _layout.tsx
    index.tsx
    (auth)/
      login.tsx
      register.tsx
    (tabs)/
      settings.tsx
  src/
    api/
      auth.ts
      users.ts
      client.ts
    features/
      auth/
        authStore.ts
        schemas.ts
        types.ts
    features/
      settings/
        types.ts
```

Responsibilities:

- `backend/app/models/user.py`: database representation of a registered user.
- `backend/app/models/user_settings.py`: one settings row per user.
- `backend/app/core/security.py`: password hashing and JWT helpers.
- `backend/app/api/deps.py`: authenticated current-user dependency.
- `backend/app/services/auth_service.py`: registration and login business rules.
- `backend/app/services/user_service.py`: profile/settings update logic.
- `backend/app/api/v1/auth.py`: auth endpoints.
- `backend/app/api/v1/users.py`: current user and settings endpoints.
- `mobile/src/api/client.ts`: add auth header support and non-GET helpers.
- `mobile/src/api/auth.ts`: register/login/me/logout wrappers.
- `mobile/src/api/users.ts`: current user and settings wrappers.
- `mobile/src/features/auth/authStore.ts`: session state and token persistence.
- `mobile/app/(auth)/*.tsx`: real auth forms.
- `mobile/app/_layout.tsx` and `mobile/app/index.tsx`: session restoration and route selection.
- `mobile/app/(tabs)/settings.tsx`: basic account/settings display and logout.

---

### Task 1: Add Backend User Models and Migration

**Files:**
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/user_settings.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/20260715_0001_create_users_and_settings.py`
- Test: `backend/app/tests/test_auth.py`

- [ ] **Step 1: Write failing model tests**

Create `backend/app/tests/test_auth.py` with:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, User, UserSettings


def test_user_and_settings_tables_can_be_created_in_sqlite() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    table_names = set(Base.metadata.tables.keys())

    assert "users" in table_names
    assert "user_settings" in table_names


def test_user_settings_defaults_can_be_persisted() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        user = User(email="cook@example.com", password_hash="hashed", nickname="Cook")
        session.add(user)
        session.flush()

        settings = UserSettings(user_id=user.id)
        session.add(settings)
        session.commit()

        saved = session.query(UserSettings).filter_by(user_id=user.id).one()

    assert saved.theme_mode == "light"
    assert saved.primary_color == "#F97316"
    assert saved.default_reminder_minutes == 30
    assert saved.notifications_enabled is True
```

- [ ] **Step 2: Run model tests and verify they fail**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth.py -v
```

Expected: FAIL with import error for `User` or `UserSettings` before models are implemented. If pytest is unavailable, record the exact command failure and continue.

- [ ] **Step 3: Create user model**

Create `backend/app/models/user.py` with:

```python
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str] = mapped_column(String(80), nullable=False)
    avatar_image_id: Mapped[int | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    settings: Mapped["UserSettings"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
```

- [ ] **Step 4: Create user settings model**

Create `backend/app/models/user_settings.py` with:

```python
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    theme_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="light")
    primary_color: Mapped[str] = mapped_column(String(16), nullable=False, default="#F97316")
    default_reminder_minutes: Mapped[int] = mapped_column(nullable=False, default=30)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="settings")
```

- [ ] **Step 5: Export models**

Replace `backend/app/models/__init__.py` with:

```python
from app.core.database import Base
from app.models.user import User
from app.models.user_settings import UserSettings

__all__ = ["Base", "User", "UserSettings"]
```

- [ ] **Step 6: Create Alembic migration**

Create `backend/alembic/versions/20260715_0001_create_users_and_settings.py` with:

```python
"""create users and user settings

Revision ID: 20260715_0001
Revises: 
Create Date: 2026-07-15

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260715_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("nickname", sa.String(length=80), nullable=False),
        sa.Column("avatar_image_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=True)

    op.create_table(
        "user_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("theme_mode", sa.String(length=16), nullable=False),
        sa.Column("primary_color", sa.String(length=16), nullable=False),
        sa.Column("default_reminder_minutes", sa.Integer(), nullable=False),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_user_settings_id"), "user_settings", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_settings_id"), table_name="user_settings")
    op.drop_table("user_settings")
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
```

- [ ] **Step 7: Run model tests**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth.py -v
```

Expected: the two model tests pass. If pytest is unavailable, run this direct import check instead:

```bash
cd backend
source .venv/Scripts/activate
python - <<'PY'
from sqlalchemy import create_engine
from app.models import Base, User, UserSettings
engine = create_engine('sqlite+pysqlite:///:memory:')
Base.metadata.create_all(bind=engine)
assert 'users' in Base.metadata.tables
assert 'user_settings' in Base.metadata.tables
print('model import and metadata check passed')
PY
```

- [ ] **Step 8: Commit user models**

If using git, run:

```bash
git add backend/app/models backend/app/tests/test_auth.py backend/alembic/versions/20260715_0001_create_users_and_settings.py
git commit -m "feat: add user account models"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 2: Add Backend Security Helpers

**Files:**
- Create: `backend/app/core/security.py`
- Test: `backend/app/tests/test_security.py`

- [ ] **Step 1: Write failing security tests**

Create `backend/app/tests/test_security.py` with:

```python
from datetime import UTC, datetime

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_hash_password_does_not_store_plain_text() -> None:
    hashed = hash_password("secret-password")

    assert hashed != "secret-password"
    assert verify_password("secret-password", hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_create_and_decode_access_token() -> None:
    token = create_access_token(subject="123")

    payload = decode_access_token(token)

    assert payload["sub"] == "123"
    assert datetime.fromtimestamp(payload["exp"], tz=UTC) > datetime.now(tz=UTC)
```

- [ ] **Step 2: Run security tests and verify they fail**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_security.py -v
```

Expected: FAIL with import error for `app.core.security`. If pytest is unavailable, record exact failure and continue.

- [ ] **Step 3: Implement security helpers**

Create `backend/app/core/security.py` with:

```python
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return password_context.verify(plain_password, password_hash)


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(tz=UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc
```

- [ ] **Step 4: Run security tests**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_security.py -v
```

Expected: both security tests pass. If pytest is unavailable, run this direct check instead:

```bash
cd backend
source .venv/Scripts/activate
python - <<'PY'
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
hashed = hash_password('secret-password')
assert hashed != 'secret-password'
assert verify_password('secret-password', hashed)
assert not verify_password('wrong-password', hashed)
token = create_access_token('123')
assert decode_access_token(token)['sub'] == '123'
print('security direct checks passed')
PY
```

- [ ] **Step 5: Commit security helpers**

If using git, run:

```bash
git add backend/app/core/security.py backend/app/tests/test_security.py
git commit -m "feat: add password and token helpers"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 3: Add Backend Auth Schemas and Services

**Files:**
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/user_settings.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/services/user_service.py`
- Test: `backend/app/tests/test_auth_service.py`

- [ ] **Step 1: Write failing auth service tests**

Create `backend/app/tests/test_auth_service.py` with:

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.auth_service import authenticate_user, register_user


@pytest.fixture()
def db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as session:
        yield session


def test_register_user_with_email_creates_settings(db_session: Session) -> None:
    user = register_user(
        db_session,
        RegisterRequest(email="cook@example.com", phone=None, password="secret123", nickname="Cook"),
    )

    assert user.id is not None
    assert user.email == "cook@example.com"
    assert user.phone is None
    assert user.nickname == "Cook"
    assert user.settings is not None
    assert user.settings.default_reminder_minutes == 30


def test_register_user_rejects_missing_email_and_phone(db_session: Session) -> None:
    with pytest.raises(ValueError, match="email or phone"):
        register_user(
            db_session,
            RegisterRequest(email=None, phone=None, password="secret123", nickname="Cook"),
        )


def test_register_user_rejects_duplicate_email(db_session: Session) -> None:
    request = RegisterRequest(
        email="cook@example.com", phone=None, password="secret123", nickname="Cook"
    )
    register_user(db_session, request)

    with pytest.raises(ValueError, match="already registered"):
        register_user(db_session, request)


def test_authenticate_user_with_email(db_session: Session) -> None:
    register_user(
        db_session,
        RegisterRequest(email="cook@example.com", phone=None, password="secret123", nickname="Cook"),
    )

    user = authenticate_user(
        db_session,
        LoginRequest(identifier="cook@example.com", password="secret123"),
    )

    assert user is not None
    assert user.email == "cook@example.com"


def test_authenticate_user_rejects_wrong_password(db_session: Session) -> None:
    register_user(
        db_session,
        RegisterRequest(email="cook@example.com", phone=None, password="secret123", nickname="Cook"),
    )

    user = authenticate_user(
        db_session,
        LoginRequest(identifier="cook@example.com", password="wrong"),
    )

    assert user is None
```

- [ ] **Step 2: Run auth service tests and verify they fail**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth_service.py -v
```

Expected: FAIL with import errors for missing schemas/services. If pytest is unavailable, record exact failure and continue.

- [ ] **Step 3: Create user schemas**

Create `backend/app/schemas/user.py` with:

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserBase(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=3, max_length=32)
    nickname: str = Field(min_length=1, max_length=80)
    avatar_image_id: int | None = None


class UserRead(UserBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    nickname: str | None = Field(default=None, min_length=1, max_length=80)
    avatar_image_id: int | None = None
```

- [ ] **Step 4: Create user settings schemas**

Create `backend/app/schemas/user_settings.py` with:

```python
from pydantic import BaseModel, ConfigDict, Field


class UserSettingsRead(BaseModel):
    theme_mode: str
    primary_color: str
    default_reminder_minutes: int
    notifications_enabled: bool

    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    theme_mode: str | None = Field(default=None, pattern="^(light|dark)$")
    primary_color: str | None = Field(default=None, pattern="^#[0-9A-Fa-f]{6}$")
    default_reminder_minutes: int | None = Field(default=None, ge=0, le=1440)
    notifications_enabled: bool | None = None
```

- [ ] **Step 5: Create auth schemas**

Create `backend/app/schemas/auth.py` with:

```python
from pydantic import BaseModel, EmailStr, Field, model_validator

from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    nickname: str = Field(min_length=1, max_length=80)

    @model_validator(mode="after")
    def validate_identifier(self) -> "RegisterRequest":
        if not self.email and not self.phone:
            raise ValueError("email or phone is required")
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
```

- [ ] **Step 6: Create auth service**

Create `backend/app/services/auth_service.py` with:

```python
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User, UserSettings
from app.schemas.auth import LoginRequest, RegisterRequest


def register_user(db: Session, request: RegisterRequest) -> User:
    if not request.email and not request.phone:
        raise ValueError("email or phone is required")

    existing = db.scalar(
        select(User).where(
            or_(
                User.email == str(request.email) if request.email else False,
                User.phone == request.phone if request.phone else False,
            )
        )
    )
    if existing:
        raise ValueError("user already registered")

    user = User(
        email=str(request.email) if request.email else None,
        phone=request.phone,
        password_hash=hash_password(request.password),
        nickname=request.nickname,
    )
    db.add(user)
    db.flush()

    db.add(UserSettings(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, request: LoginRequest) -> User | None:
    user = db.scalar(
        select(User).where(or_(User.email == request.identifier, User.phone == request.identifier))
    )
    if not user:
        return None
    if not verify_password(request.password, user.password_hash):
        return None

    user.last_login_at = datetime.now(tz=UTC)
    db.commit()
    db.refresh(user)
    return user
```

- [ ] **Step 7: Create user service**

Create `backend/app/services/user_service.py` with:

```python
from sqlalchemy.orm import Session

from app.models import User, UserSettings
from app.schemas.user import UserUpdate
from app.schemas.user_settings import UserSettingsUpdate


def update_user_profile(db: Session, user: User, request: UserUpdate) -> User:
    data = request.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def get_or_create_user_settings(db: Session, user: User) -> UserSettings:
    if user.settings:
        return user.settings
    settings = UserSettings(user_id=user.id)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def update_user_settings(db: Session, user: User, request: UserSettingsUpdate) -> UserSettings:
    settings = get_or_create_user_settings(db, user)
    data = request.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
```

- [ ] **Step 8: Run auth service tests**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth_service.py -v
```

Expected: all auth service tests pass. If pytest is unavailable, run direct service checks if dependencies permit and record output.

- [ ] **Step 9: Commit auth services**

If using git, run:

```bash
git add backend/app/schemas backend/app/services backend/app/tests/test_auth_service.py
git commit -m "feat: add auth schemas and services"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 4: Add Backend Auth and User APIs

**Files:**
- Create: `backend/app/api/deps.py`
- Create: `backend/app/api/v1/auth.py`
- Create: `backend/app/api/v1/users.py`
- Modify: `backend/app/main.py`
- Test: `backend/app/tests/test_auth_api.py`
- Test: `backend/app/tests/test_users.py`

- [ ] **Step 1: Write failing auth API tests**

Create `backend/app/tests/test_auth_api.py` with:

```python
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
```

- [ ] **Step 2: Write failing user API tests**

Create `backend/app/tests/test_users.py` with:

```python
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
```

- [ ] **Step 3: Run API tests and verify they fail**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth_api.py app/tests/test_users.py -v
```

Expected: FAIL with missing endpoint/import errors. If pytest is unavailable, record exact failure and continue.

- [ ] **Step 4: Create auth dependency**

Create `backend/app/api/deps.py` with:

```python
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from None

    user = db.get(User, user_id)
    if user is None or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user
```

- [ ] **Step 5: Create auth router**

Create `backend/app/api/v1/auth.py` with:

```python
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.auth_service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    try:
        user = register_user(db, request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    user = authenticate_user(db, request)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, user=user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserRead)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user
```

- [ ] **Step 6: Create users router**

Create `backend/app/api/v1/users.py` with:

```python
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.user import UserRead, UserUpdate
from app.schemas.user_settings import UserSettingsRead, UserSettingsUpdate
from app.services.user_service import (
    get_or_create_user_settings,
    update_user_profile,
    update_user_settings,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
    request: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    return update_user_profile(db, current_user, request)


@router.get("/me/settings", response_model=UserSettingsRead)
def get_my_settings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserSettingsRead:
    return get_or_create_user_settings(db, current_user)


@router.patch("/me/settings", response_model=UserSettingsRead)
def update_my_settings(
    request: UserSettingsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserSettingsRead:
    return update_user_settings(db, current_user, request)
```

- [ ] **Step 7: Register routers in app**

Replace `backend/app/main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
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

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(users_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
```

- [ ] **Step 8: Run API tests**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth_api.py app/tests/test_users.py -v
```

Expected: all API tests pass. If pytest is unavailable, run direct TestClient checks if dependencies permit and record output.

- [ ] **Step 9: Commit auth APIs**

If using git, run:

```bash
git add backend/app/api backend/app/main.py backend/app/tests/test_auth_api.py backend/app/tests/test_users.py
git commit -m "feat: add auth and user APIs"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 5: Expand Mobile API Client for Authenticated Requests

**Files:**
- Modify: `mobile/src/api/client.ts`
- Create: `mobile/src/api/auth.ts`
- Create: `mobile/src/api/users.ts`
- Modify: `mobile/src/features/auth/types.ts`
- Modify: `mobile/src/features/settings/types.ts`

- [ ] **Step 1: Replace API client with auth-capable helpers**

Replace `mobile/src/api/client.ts` with:

```ts
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
    throw new Error(message || `${method} ${path} failed with status ${response.status}`);
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
```

- [ ] **Step 2: Update auth types**

Replace `mobile/src/features/auth/types.ts` with:

```ts
export type User = {
  id: number;
  email: string | null;
  phone: string | null;
  nickname: string;
  avatar_image_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type AuthSession = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type RegisterRequest = {
  email?: string | null;
  phone?: string | null;
  password: string;
  nickname: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type UserUpdate = {
  nickname?: string;
  avatar_image_id?: number | null;
};
```

- [ ] **Step 3: Update settings types**

Replace `mobile/src/features/settings/types.ts` with:

```ts
export type UserSettings = {
  theme_mode: "light" | "dark";
  primary_color: string;
  default_reminder_minutes: number;
  notifications_enabled: boolean;
};

export type UserSettingsUpdate = Partial<UserSettings>;
```

- [ ] **Step 4: Create auth API wrappers**

Create `mobile/src/api/auth.ts` with:

```ts
import { apiGet, apiPost } from "./client";
import { AuthSession, LoginRequest, RegisterRequest, User } from "@/features/auth/types";

export function register(request: RegisterRequest): Promise<AuthSession> {
  return apiPost<AuthSession>("/auth/register", request);
}

export function login(request: LoginRequest): Promise<AuthSession> {
  return apiPost<AuthSession>("/auth/login", request);
}

export function logout(): Promise<void> {
  return apiPost<void>("/auth/logout", undefined, { auth: true });
}

export function getMe(): Promise<User> {
  return apiGet<User>("/auth/me", { auth: true });
}
```

- [ ] **Step 5: Create user API wrappers**

Create `mobile/src/api/users.ts` with:

```ts
import { apiGet, apiPatch } from "./client";
import { User, UserUpdate } from "@/features/auth/types";
import { UserSettings, UserSettingsUpdate } from "@/features/settings/types";

export function updateMe(request: UserUpdate): Promise<User> {
  return apiPatch<User>("/users/me", request, { auth: true });
}

export function getMySettings(): Promise<UserSettings> {
  return apiGet<UserSettings>("/users/me/settings", { auth: true });
}

export function updateMySettings(request: UserSettingsUpdate): Promise<UserSettings> {
  return apiPatch<UserSettings>("/users/me/settings", request, { auth: true });
}
```

- [ ] **Step 6: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript passes.

- [ ] **Step 7: Commit mobile auth API wrappers**

If using git, run:

```bash
git add mobile/src/api mobile/src/features/auth/types.ts mobile/src/features/settings/types.ts
git commit -m "feat: add mobile auth API wrappers"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 6: Add Mobile Auth Store and Validation Schemas

**Files:**
- Create: `mobile/src/features/auth/authStore.ts`
- Create: `mobile/src/features/auth/schemas.ts`

- [ ] **Step 1: Create auth validation schemas**

Create `mobile/src/features/auth/schemas.ts` with:

```ts
import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("请输入有效邮箱").optional().or(z.literal("")),
    phone: z.string().min(3, "手机号至少 3 位").optional().or(z.literal("")),
    nickname: z.string().min(1, "请输入昵称").max(80, "昵称不能超过 80 个字符"),
    password: z.string().min(6, "密码至少 6 位").max(128, "密码不能超过 128 位")
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "邮箱或手机号至少填写一个",
    path: ["email"]
  });

export const loginSchema = z.object({
  identifier: z.string().min(3, "请输入邮箱或手机号"),
  password: z.string().min(1, "请输入密码")
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Create auth store**

Create `mobile/src/features/auth/authStore.ts` with:

```ts
import { create } from "zustand";

import { getMe, login, register } from "@/api/auth";
import { AuthSession, LoginRequest, RegisterRequest, User } from "@/features/auth/types";
import { clearAccessToken, getAccessToken, saveAccessToken } from "@/storage/tokenStorage";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  restoreSession: () => Promise<void>;
  loginWithPassword: (request: LoginRequest) => Promise<void>;
  registerWithPassword: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
};

async function persistSession(session: AuthSession): Promise<User> {
  await saveAccessToken(session.access_token);
  return session.user;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  async restoreSession() {
    set({ status: "loading", error: null });
    const token = await getAccessToken();
    if (!token) {
      set({ user: null, status: "unauthenticated" });
      return;
    }

    try {
      const user = await getMe();
      set({ user, status: "authenticated", error: null });
    } catch {
      await clearAccessToken();
      set({ user: null, status: "unauthenticated", error: "登录已过期，请重新登录" });
    }
  },

  async loginWithPassword(request) {
    set({ status: "loading", error: null });
    try {
      const user = await persistSession(await login(request));
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      set({ user: null, status: "unauthenticated", error: error instanceof Error ? error.message : "登录失败" });
    }
  },

  async registerWithPassword(request) {
    set({ status: "loading", error: null });
    try {
      const user = await persistSession(await register(request));
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      set({ user: null, status: "unauthenticated", error: error instanceof Error ? error.message : "注册失败" });
    }
  },

  async logout() {
    await clearAccessToken();
    set({ user: null, status: "unauthenticated", error: null });
  }
}));
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript passes.

- [ ] **Step 4: Commit mobile auth store**

If using git, run:

```bash
git add mobile/src/features/auth/authStore.ts mobile/src/features/auth/schemas.ts
git commit -m "feat: add mobile auth store"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 7: Replace Mobile Auth Screens

**Files:**
- Modify: `mobile/app/(auth)/login.tsx`
- Modify: `mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Replace login screen**

Replace `mobile/app/(auth)/login.tsx` with:

```tsx
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { loginSchema } from "@/features/auth/schemas";

export default function LoginScreen() {
  const { error, loginWithPassword, status, user } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/(tabs)/recipes" />;
  }

  async function submit() {
    const result = loginSchema.safeParse({ identifier, password });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "请检查输入");
      return;
    }
    setFormError(null);
    await loginWithPassword(result.data);
  }

  return (
    <AppScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>登录 Cook Picture</Text>
        <TextInput
          autoCapitalize="none"
          placeholder="邮箱或手机号"
          value={identifier}
          onChangeText={setIdentifier}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="密码"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        {formError ? <Text style={{ color: "#DC2626" }}>{formError}</Text> : null}
        {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
        <Button title={status === "loading" ? "登录中..." : "登录"} onPress={submit} />
        <Link href="/(auth)/register">还没有账号？去注册</Link>
      </View>
    </AppScreen>
  );
}
```

- [ ] **Step 2: Replace register screen**

Replace `mobile/app/(auth)/register.tsx` with:

```tsx
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";
import { registerSchema } from "@/features/auth/schemas";

export default function RegisterScreen() {
  const { error, registerWithPassword, status, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/(tabs)/recipes" />;
  }

  async function submit() {
    const result = registerSchema.safeParse({ email, phone, nickname, password });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "请检查输入");
      return;
    }
    setFormError(null);
    await registerWithPassword({
      email: result.data.email || null,
      phone: result.data.phone || null,
      nickname: result.data.nickname,
      password: result.data.password
    });
  }

  return (
    <AppScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>注册账号</Text>
        <TextInput
          autoCapitalize="none"
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="手机号（可选，如果已填邮箱）"
          value={phone}
          onChangeText={setPhone}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="昵称"
          value={nickname}
          onChangeText={setNickname}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <TextInput
          placeholder="密码"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        {formError ? <Text style={{ color: "#DC2626" }}>{formError}</Text> : null}
        {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
        <Button title={status === "loading" ? "注册中..." : "注册"} onPress={submit} />
        <Link href="/(auth)/login">已有账号？去登录</Link>
      </View>
    </AppScreen>
  );
}
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript passes.

- [ ] **Step 4: Commit auth screens**

If using git, run:

```bash
git add mobile/app/'(auth)'/login.tsx mobile/app/'(auth)'/register.tsx
git commit -m "feat: add mobile auth screens"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 8: Add Mobile Session Routing and Account Settings UI

**Files:**
- Modify: `mobile/app/_layout.tsx`
- Modify: `mobile/app/index.tsx`
- Modify: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Update root layout to restore session**

Replace `mobile/app/_layout.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/features/auth/authStore";
import { ThemeProvider } from "@/theme/ThemeProvider";

function SessionBootstrap() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return null;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionBootstrap />
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Update index route for auth state**

Replace `mobile/app/index.tsx` with:

```tsx
import { Redirect } from "expo-router";
import { Text } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";

export default function IndexRoute() {
  const { status, user } = useAuthStore();

  if (status === "idle" || status === "loading") {
    return (
      <AppScreen>
        <Text>正在检查登录状态...</Text>
      </AppScreen>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/recipes" />;
  }

  return <Redirect href="/(auth)/login" />;
}
```

- [ ] **Step 3: Replace settings screen with account UI**

Replace `mobile/app/(tabs)/settings.tsx` with:

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { getHealth } from "@/api/health";
import { getMySettings, updateMe, updateMySettings } from "@/api/users";
import { AppScreen } from "@/components/AppScreen";
import { useAuthStore } from "@/features/auth/authStore";

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname ?? "");

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: false
  });

  const settingsQuery = useQuery({
    queryKey: ["my-settings"],
    queryFn: getMySettings,
    enabled: Boolean(user)
  });

  const updateProfileMutation = useMutation({
    mutationFn: () => updateMe({ nickname }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-settings"] });
    }
  });

  const updateReminderMutation = useMutation({
    mutationFn: () => updateMySettings({ default_reminder_minutes: 60 }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-settings"] });
    }
  });

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>设置</Text>
      <Text>API 状态：{healthQuery.data?.status ?? "未连接"}</Text>
      {healthQuery.error ? <Text>API 连接失败，请确认后端已启动。</Text> : null}

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>账户</Text>
        <Text>当前用户：{user.email ?? user.phone}</Text>
        <TextInput
          placeholder="昵称"
          value={nickname}
          onChangeText={setNickname}
          style={{ borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}
        />
        <Button title="保存昵称" onPress={() => updateProfileMutation.mutate()} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>提醒管理</Text>
        <Text>默认提前提醒：{settingsQuery.data?.default_reminder_minutes ?? "加载中"} 分钟</Text>
        <Button title="设为提前 60 分钟" onPress={() => updateReminderMutation.mutate()} />
      </View>

      <Button title="退出登录" onPress={logout} />
    </AppScreen>
  );
}
```

- [ ] **Step 4: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript passes.

- [ ] **Step 5: Commit session routing and settings UI**

If using git, run:

```bash
git add mobile/app/_layout.tsx mobile/app/index.tsx mobile/app/'(tabs)'/settings.tsx
git commit -m "feat: add session routing and account settings"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

### Task 9: Document Auth Milestone Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add auth verification docs**

Append this section to `README.md`:

```markdown
## Auth Milestone Verification

After backend dependencies are installed and the database is configured, run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth.py app/tests/test_security.py app/tests/test_auth_service.py app/tests/test_auth_api.py app/tests/test_users.py -v
```

Manual backend auth check:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"cook@example.com","password":"secret123","nickname":"Cook"}'
```

Expected response includes `access_token`, `token_type: bearer`, and user email `cook@example.com`.

Manual mobile auth check:

1. Start backend with `uvicorn app.main:app --reload`.
2. Start mobile with `npm run start`.
3. Open register screen.
4. Register with email, nickname, and password.
5. Confirm the app routes to the tabs.
6. Open Settings and confirm account information appears.
7. Tap logout and confirm the app returns to login.
```

- [ ] **Step 2: Run available verification**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript passes.

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth.py app/tests/test_security.py app/tests/test_auth_service.py app/tests/test_auth_api.py app/tests/test_users.py -v
```

Expected: tests pass if backend dependencies are installed. If pytest is unavailable, record exact failure.

- [ ] **Step 3: Commit docs**

If using git, run:

```bash
git add README.md
git commit -m "docs: document auth milestone verification"
```

Expected: git creates one commit. If the directory is not a git repository, skip this step.

---

## Final Verification

Run these commands after all tasks are complete:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_auth.py app/tests/test_security.py app/tests/test_auth_service.py app/tests/test_auth_api.py app/tests/test_users.py -v
```

Expected: all auth/account backend tests pass when backend dependencies are installed.

```bash
cd mobile
npm run typecheck
```

Expected: no TypeScript errors.

Manual end-to-end check:

1. Start backend:

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload
```

2. Start mobile:

```bash
cd mobile
npm run start
```

3. Register a new user.
4. Confirm the app routes to the tab UI.
5. Close and reopen the app.
6. Confirm login state is restored.
7. Open Settings.
8. Update nickname.
9. Update default reminder minutes.
10. Logout.
11. Confirm the app returns to login.

## Spec Coverage Review

This plan covers these requirements from the approved spec:

- 手机号/邮箱 + 密码注册登录。
- 用户注册。
- 用户登录。
- 用户退出登录。
- 查看和编辑基础账户信息。
- 登录态保持。
- 用户设置表初始化。
- 基础提醒默认值设置 endpoint。
- Token 使用 SecureStore 保存。

Requirements intentionally deferred:

- 头像真实图片上传。
- 修改密码。
- 短信验证码登录。
- 第三方登录。
- 隐私政策和用户协议页面。
- 完整主题设置界面。
