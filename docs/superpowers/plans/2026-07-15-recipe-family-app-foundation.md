# Recipe Family App Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the project foundation for the React Native + Expo mobile app and FastAPI + MySQL backend so later feature milestones can be implemented on a stable base.

**Architecture:** This plan creates a two-app monorepo-style workspace with `mobile/` for the Expo app and `backend/` for the FastAPI API. It establishes health checks, environment configuration, database connectivity, migration tooling, typed API access, theme scaffolding, and basic tests. The full product spec is intentionally split into milestone plans because the approved spec contains multiple subsystems: auth, recipes, families, orders, notifications, reminders, settings, and deployment.

**Tech Stack:** React Native, Expo, TypeScript, Expo Router, TanStack Query, Zustand, FastAPI, Python 3.12, SQLAlchemy 2.x, Alembic, Pydantic v2, MySQL 8, pytest.

---

## Scope Note

The approved design document at `docs/superpowers/specs/2026-07-15-recipe-family-app-design.md` covers the whole MVP. Implementing the entire product in one plan would be too large and hard to verify. Use this plan for **Milestone 1: Project Foundation** only.

After this plan is complete and verified, create separate implementation plans for:

1. Registration, login, account settings.
2. Recipes and image uploads.
3. Families and shared recipes.
4. Orders, task lists, and in-app notifications.
5. Local reminders, theme settings, help/about pages.
6. Production deployment hardening.

## Target File Structure

Create this structure:

```text
cook_picture/
  README.md
  .gitignore
  .env.example
  docs/
    superpowers/
      specs/
        2026-07-15-recipe-family-app-design.md
      plans/
        2026-07-15-recipe-family-app-foundation.md
  backend/
    .env.example
    alembic.ini
    pyproject.toml
    app/
      __init__.py
      main.py
      api/
        __init__.py
        v1/
          __init__.py
          health.py
      core/
        __init__.py
        config.py
        database.py
      models/
        __init__.py
      schemas/
        __init__.py
        health.py
      services/
        __init__.py
      repositories/
        __init__.py
      tests/
        __init__.py
        conftest.py
        test_health.py
    alembic/
      env.py
      script.py.mako
      versions/
        .gitkeep
  mobile/
    app.json
    package.json
    tsconfig.json
    babel.config.js
    .env.example
    app/
      _layout.tsx
      index.tsx
      (auth)/
        login.tsx
        register.tsx
      (tabs)/
        _layout.tsx
        recipes.tsx
        family.tsx
        tasks.tsx
        settings.tsx
    src/
      api/
        client.ts
        health.ts
      components/
        AppScreen.tsx
      features/
        auth/
          types.ts
        recipes/
          types.ts
        families/
          types.ts
        orders/
          types.ts
        notifications/
          types.ts
        settings/
          types.ts
      theme/
        theme.ts
        ThemeProvider.tsx
      storage/
        tokenStorage.ts
      types/
        api.ts
```

Responsibilities:

- `backend/app/main.py`: FastAPI application setup and router registration.
- `backend/app/api/v1/health.py`: Health API endpoints.
- `backend/app/core/config.py`: Environment settings.
- `backend/app/core/database.py`: SQLAlchemy engine/session setup.
- `backend/app/schemas/health.py`: Typed health response schema.
- `backend/app/tests/`: Backend tests.
- `mobile/app/`: Expo Router screens and navigation.
- `mobile/src/api/`: Typed API client and endpoint wrappers.
- `mobile/src/theme/`: Theme tokens and provider.
- `mobile/src/storage/`: Token persistence abstraction.
- `mobile/src/features/`: Feature-owned types; actual feature implementation comes in later milestone plans.

---

### Task 1: Create Repository Metadata

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create root README**

Create `README.md` with:

```markdown
# Cook Picture

Cook Picture is a lightweight mobile app for personal recipes, family recipe sharing, family meal requests, cooking assignments, and local cooking reminders.

## Apps

- `mobile/`: React Native + Expo mobile app.
- `backend/`: FastAPI API server.

## MVP Milestones

1. Project foundation.
2. Registration, login, and account settings.
3. Recipes and image uploads.
4. Families and shared recipes.
5. Orders, task lists, and in-app notifications.
6. Local reminders and settings.

## Development

Backend and mobile setup instructions live in their own folders after the foundation milestone is complete.
```

- [ ] **Step 2: Create root gitignore**

Create `.gitignore` with:

```gitignore
# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.*
!.env.example

# Python
__pycache__/
*.py[cod]
.pytest_cache/
.mypy_cache/
.ruff_cache/
.venv/
venv/
dist/
build/
*.egg-info/

# Node / Expo
node_modules/
.expo/
.expo-shared/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# App build outputs
android/
ios/
web-build/

# Uploads and local runtime files
backend/uploads/
backend/.coverage
backend/htmlcov/
```

- [ ] **Step 3: Create root env example**

Create `.env.example` with:

```dotenv
# Root-level reference only. Copy app-specific files from backend/.env.example and mobile/.env.example.
APP_NAME=Cook Picture
```

- [ ] **Step 4: Verify files exist**

Run:

```bash
ls README.md .gitignore .env.example
```

Expected output includes:

```text
.env.example
.gitignore
README.md
```

- [ ] **Step 5: Commit repository metadata**

If the project has been initialized as a git repository, run:

```bash
git add README.md .gitignore .env.example
git commit -m "chore: add repository metadata"
```

Expected: git creates one commit. If the directory is not a git repository, skip this commit step and record that git initialization is pending.

---

### Task 2: Create FastAPI Backend Skeleton

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/v1/__init__.py`
- Create: `backend/app/api/v1/health.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/health.py`

- [ ] **Step 1: Create backend pyproject**

Create `backend/pyproject.toml` with:

```toml
[project]
name = "cook-picture-backend"
version = "0.1.0"
description = "FastAPI backend for Cook Picture"
requires-python = ">=3.12"
dependencies = [
  "alembic>=1.13.2",
  "bcrypt>=4.1.3",
  "cryptography>=42.0.8",
  "email-validator>=2.2.0",
  "fastapi>=0.111.0",
  "passlib[bcrypt]>=1.7.4",
  "pydantic-settings>=2.3.4",
  "pydantic>=2.8.2",
  "pymysql>=1.1.1",
  "python-jose[cryptography]>=3.3.0",
  "python-multipart>=0.0.9",
  "sqlalchemy>=2.0.31",
  "uvicorn[standard]>=0.30.1"
]

[project.optional-dependencies]
dev = [
  "httpx>=0.27.0",
  "pytest>=8.2.2",
  "pytest-asyncio>=0.23.7",
  "ruff>=0.5.0"
]

[tool.pytest.ini_options]
testpaths = ["app/tests"]
pythonpath = ["."]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
```

- [ ] **Step 2: Create backend env example**

Create `backend/.env.example` with:

```dotenv
APP_NAME=Cook Picture API
ENVIRONMENT=development
API_V1_PREFIX=/api/v1
DATABASE_URL=mysql+pymysql://cook_picture:change_me@127.0.0.1:3306/cook_picture
JWT_SECRET_KEY=change-this-secret-before-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
STORAGE_PROVIDER=local
LOCAL_UPLOAD_DIR=uploads
PUBLIC_BASE_URL=http://127.0.0.1:8000
```

- [ ] **Step 3: Create Python package marker files**

Create empty files:

```text
backend/app/__init__.py
backend/app/api/__init__.py
backend/app/api/v1/__init__.py
backend/app/schemas/__init__.py
```

- [ ] **Step 4: Create health schema**

Create `backend/app/schemas/health.py` with:

```python
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_name: str
    environment: str
```

- [ ] **Step 5: Create health router**

Create `backend/app/api/v1/health.py` with:

```python
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        environment=settings.environment,
    )
```

- [ ] **Step 6: Create FastAPI app**

Create `backend/app/main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
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
    return app


app = create_app()
```

- [ ] **Step 7: Install backend dependencies**

Run:

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -e ".[dev]"
```

Expected: dependencies install successfully and no package resolution error appears.

- [ ] **Step 8: Commit backend skeleton**

If using git, run:

```bash
git add backend/pyproject.toml backend/.env.example backend/app
git commit -m "feat: add FastAPI backend skeleton"
```

Expected: git creates one commit.

---

### Task 3: Add Backend Configuration

**Files:**
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Test: `backend/app/tests/test_health.py`
- Create: `backend/app/tests/__init__.py`

- [ ] **Step 1: Write failing health test**

Create `backend/app/tests/__init__.py` as an empty file.

Create `backend/app/tests/test_health.py` with:

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health_check_returns_app_status() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "app_name": "Cook Picture API",
        "environment": "development",
    }
```

- [ ] **Step 2: Run test to verify it fails before config exists**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_health.py -v
```

Expected: FAIL with an import error mentioning `app.core.config` if Task 2 was executed exactly before this task.

- [ ] **Step 3: Create config package marker**

Create `backend/app/core/__init__.py` as an empty file.

- [ ] **Step 4: Implement settings**

Create `backend/app/core/config.py` with:

```python
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cook Picture API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "mysql+pymysql://cook_picture:change_me@127.0.0.1:3306/cook_picture"
    jwt_secret_key: str = "change-this-secret-before-production"
    access_token_expire_minutes: int = 1440
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:8081"])
    storage_provider: str = "local"
    local_upload_dir: str = "uploads"
    public_base_url: str = "http://127.0.0.1:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

- [ ] **Step 5: Run health test to verify it passes**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_health.py -v
```

Expected: PASS for `test_health_check_returns_app_status`.

- [ ] **Step 6: Run backend server manually**

Run:

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload
```

In another terminal run:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected JSON:

```json
{"status":"ok","app_name":"Cook Picture API","environment":"development"}
```

Stop the server with Ctrl+C.

- [ ] **Step 7: Commit backend configuration**

If using git, run:

```bash
git add backend/app/core backend/app/tests
git commit -m "test: cover backend health endpoint"
```

Expected: git creates one commit.

---

### Task 4: Add Database Session and Alembic Foundation

**Files:**
- Create: `backend/app/core/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/.gitkeep`
- Test: `backend/app/tests/test_database.py`

- [ ] **Step 1: Write failing database configuration test**

Create `backend/app/tests/test_database.py` with:

```python
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine


def test_database_engine_uses_configured_url() -> None:
    assert "mysql+pymysql" in str(engine.url)


def test_session_local_creates_session() -> None:
    session = SessionLocal()
    try:
        assert isinstance(session, Session)
    finally:
        session.close()
```

- [ ] **Step 2: Run test to verify it fails before database module exists**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_database.py -v
```

Expected: FAIL with an import error mentioning `app.core.database`.

- [ ] **Step 3: Create database module**

Create `backend/app/core/database.py` with:

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 4: Create models package marker**

Create `backend/app/models/__init__.py` with:

```python
from app.core.database import Base

__all__ = ["Base"]
```

- [ ] **Step 5: Create Alembic config**

Create `backend/alembic.ini` with:

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = mysql+pymysql://cook_picture:change_me@127.0.0.1:3306/cook_picture

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 6: Create Alembic env**

Create `backend/alembic/env.py` with:

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.models import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 7: Create Alembic script template**

Create `backend/alembic/script.py.mako` with:

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = ${repr(up_revision)}
down_revision: str | None = ${repr(down_revision)}
branch_labels: str | Sequence[str] | None = ${repr(branch_labels)}
depends_on: str | Sequence[str] | None = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 8: Create Alembic versions placeholder**

Create `backend/alembic/versions/.gitkeep` as an empty file.

- [ ] **Step 9: Run database tests**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest app/tests/test_database.py -v
```

Expected: PASS for both tests without requiring an active MySQL connection.

- [ ] **Step 10: Verify Alembic can inspect metadata without models**

Run:

```bash
cd backend
source .venv/Scripts/activate
alembic revision --autogenerate -m "empty baseline"
```

Expected: If MySQL is not running, Alembic fails with a database connection error. That is acceptable at this stage. If MySQL is running and the configured database exists, Alembic creates an empty migration under `backend/alembic/versions/`. Delete that empty migration before committing because the first real migration belongs in the auth milestone.

- [ ] **Step 11: Commit database foundation**

If using git, run:

```bash
git add backend/app/core/database.py backend/app/models backend/app/tests/test_database.py backend/alembic.ini backend/alembic
git commit -m "feat: add database and migration foundation"
```

Expected: git creates one commit.

---

### Task 5: Create Expo Mobile Skeleton

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/app.json`
- Create: `mobile/tsconfig.json`
- Create: `mobile/babel.config.js`
- Create: `mobile/.env.example`
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/index.tsx`
- Create: `mobile/app/(auth)/login.tsx`
- Create: `mobile/app/(auth)/register.tsx`
- Create: `mobile/app/(tabs)/_layout.tsx`
- Create: `mobile/app/(tabs)/recipes.tsx`
- Create: `mobile/app/(tabs)/family.tsx`
- Create: `mobile/app/(tabs)/tasks.tsx`
- Create: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Create mobile package file**

Create `mobile/package.json` with:

```json
{
  "name": "cook-picture-mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.0.2",
    "@react-native-async-storage/async-storage": "^1.23.1",
    "@tanstack/react-query": "^5.51.11",
    "expo": "^51.0.20",
    "expo-constants": "^16.0.2",
    "expo-image-picker": "^15.0.7",
    "expo-notifications": "^0.28.12",
    "expo-router": "^3.5.18",
    "expo-secure-store": "^13.0.2",
    "expo-status-bar": "^1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.3",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "zod": "^3.23.8",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@types/react": "~18.2.79",
    "typescript": "~5.3.3"
  }
}
```

- [ ] **Step 2: Create Expo app config**

Create `mobile/app.json` with:

```json
{
  "expo": {
    "name": "Cook Picture",
    "slug": "cook-picture",
    "scheme": "cookpicture",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#FFF7ED"
      }
    },
    "plugins": ["expo-router", "expo-secure-store", "expo-notifications", "expo-image-picker"],
    "extra": {
      "apiBaseUrl": "http://127.0.0.1:8000/api/v1"
    }
  }
}
```

- [ ] **Step 3: Create TypeScript config**

Create `mobile/tsconfig.json` with:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["app", "src", "expo-env.d.ts"]
}
```

- [ ] **Step 4: Create Babel config**

Create `mobile/babel.config.js` with:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["expo-router/babel"]
  };
};
```

- [ ] **Step 5: Create mobile env example**

Create `mobile/.env.example` with:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

- [ ] **Step 6: Create root layout**

Create `mobile/app/_layout.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";

import { ThemeProvider } from "@/theme/ThemeProvider";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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

- [ ] **Step 7: Create index route**

Create `mobile/app/index.tsx` with:

```tsx
import { Redirect } from "expo-router";

export default function IndexRoute() {
  return <Redirect href="/(auth)/login" />;
}
```

- [ ] **Step 8: Create auth placeholder screens**

Create `mobile/app/(auth)/login.tsx` with:

```tsx
import { Link } from "expo-router";
import { Text, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";

export default function LoginScreen() {
  return (
    <AppScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>登录 Cook Picture</Text>
        <Text>使用手机号或邮箱登录。完整表单将在账户里程碑实现。</Text>
        <Link href="/(auth)/register">还没有账号？去注册</Link>
        <Link href="/(tabs)/recipes">临时进入应用首页</Link>
      </View>
    </AppScreen>
  );
}
```

Create `mobile/app/(auth)/register.tsx` with:

```tsx
import { Link } from "expo-router";
import { Text, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";

export default function RegisterScreen() {
  return (
    <AppScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>注册账号</Text>
        <Text>手机号/邮箱 + 密码注册将在账户里程碑实现。</Text>
        <Link href="/(auth)/login">已有账号？去登录</Link>
      </View>
    </AppScreen>
  );
}
```

- [ ] **Step 9: Create tab layout and placeholder screens**

Create `mobile/app/(tabs)/_layout.tsx` with:

```tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="recipes" options={{ title: "菜谱" }} />
      <Tabs.Screen name="family" options={{ title: "家庭" }} />
      <Tabs.Screen name="tasks" options={{ title: "清单" }} />
      <Tabs.Screen name="settings" options={{ title: "设置" }} />
    </Tabs>
  );
}
```

Create `mobile/app/(tabs)/recipes.tsx` with:

```tsx
import { Text } from "react-native";

import { AppScreen } from "@/components/AppScreen";

export default function RecipesScreen() {
  return (
    <AppScreen>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>菜谱</Text>
      <Text>我的菜谱列表、新建菜谱和共享到家庭将在菜谱里程碑实现。</Text>
    </AppScreen>
  );
}
```

Create `mobile/app/(tabs)/family.tsx` with:

```tsx
import { Text } from "react-native";

import { AppScreen } from "@/components/AppScreen";

export default function FamilyScreen() {
  return (
    <AppScreen>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>家庭</Text>
      <Text>创建家庭、邀请码加入和家庭菜谱将在家庭里程碑实现。</Text>
    </AppScreen>
  );
}
```

Create `mobile/app/(tabs)/tasks.tsx` with:

```tsx
import { Text } from "react-native";

import { AppScreen } from "@/components/AppScreen";

export default function TasksScreen() {
  return (
    <AppScreen>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>清单</Text>
      <Text>我点的菜、我要做的菜和任务状态将在点菜里程碑实现。</Text>
    </AppScreen>
  );
}
```

Create `mobile/app/(tabs)/settings.tsx` with:

```tsx
import { Text } from "react-native";

import { AppScreen } from "@/components/AppScreen";

export default function SettingsScreen() {
  return (
    <AppScreen>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>设置</Text>
      <Text>账户、主题、提醒管理、帮助与关于将在设置里程碑实现。</Text>
    </AppScreen>
  );
}
```

- [ ] **Step 10: Install mobile dependencies**

Run:

```bash
cd mobile
npm install
```

Expected: dependencies install successfully and `package-lock.json` is created.

- [ ] **Step 11: Commit mobile skeleton**

If using git, run:

```bash
git add mobile
git commit -m "feat: add Expo mobile skeleton"
```

Expected: git creates one commit.

---

### Task 6: Add Mobile Theme and Shared Screen Component

**Files:**
- Create: `mobile/src/theme/theme.ts`
- Create: `mobile/src/theme/ThemeProvider.tsx`
- Create: `mobile/src/components/AppScreen.tsx`

- [ ] **Step 1: Create theme tokens**

Create `mobile/src/theme/theme.ts` with:

```ts
export type ThemeMode = "light" | "dark";
export type CardStyle = "soft" | "flat";

export type AppTheme = {
  mode: ThemeMode;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  backgroundImageUrl: string | null;
  familySpaceCoverImageUrl: string | null;
  cardStyle: CardStyle;
  fontScale: number;
};

export const lightTheme: AppTheme = {
  mode: "light",
  primaryColor: "#F97316",
  backgroundColor: "#FFF7ED",
  surfaceColor: "#FFFFFF",
  textColor: "#1F2937",
  mutedTextColor: "#6B7280",
  borderColor: "#FED7AA",
  backgroundImageUrl: null,
  familySpaceCoverImageUrl: null,
  cardStyle: "soft",
  fontScale: 1
};

export const darkTheme: AppTheme = {
  mode: "dark",
  primaryColor: "#FB923C",
  backgroundColor: "#111827",
  surfaceColor: "#1F2937",
  textColor: "#F9FAFB",
  mutedTextColor: "#D1D5DB",
  borderColor: "#374151",
  backgroundImageUrl: null,
  familySpaceCoverImageUrl: null,
  cardStyle: "soft",
  fontScale: 1
};
```

- [ ] **Step 2: Create theme provider**

Create `mobile/src/theme/ThemeProvider.tsx` with:

```tsx
import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

import { AppTheme, lightTheme, ThemeMode, darkTheme } from "./theme";

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("light");

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      setMode,
      theme: mode === "dark" ? darkTheme : lightTheme
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used inside ThemeProvider");
  }
  return value;
}
```

- [ ] **Step 3: Create shared screen wrapper**

Create `mobile/src/components/AppScreen.tsx` with:

```tsx
import { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet } from "react-native";

import { useAppTheme } from "@/theme/ThemeProvider";

export function AppScreen({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    gap: 12,
    padding: 20
  }
});
```

- [ ] **Step 4: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

- [ ] **Step 5: Commit theme foundation**

If using git, run:

```bash
git add mobile/src/theme mobile/src/components mobile/app
git commit -m "feat: add mobile theme foundation"
```

Expected: git creates one commit.

---

### Task 7: Add Mobile API Client and Health Check

**Files:**
- Create: `mobile/src/types/api.ts`
- Create: `mobile/src/api/client.ts`
- Create: `mobile/src/api/health.ts`
- Modify: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Create API response types**

Create `mobile/src/types/api.ts` with:

```ts
export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

export type HealthResponse = {
  status: string;
  app_name: string;
  environment: string;
};
```

- [ ] **Step 2: Create API client**

Create `mobile/src/api/client.ts` with:

```ts
import Constants from "expo-constants";

const fallbackApiBaseUrl = "http://127.0.0.1:8000/api/v1";

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  fallbackApiBaseUrl;

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
```

- [ ] **Step 3: Create health API wrapper**

Create `mobile/src/api/health.ts` with:

```ts
import { apiGet } from "./client";
import { HealthResponse } from "@/types/api";

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}
```

- [ ] **Step 4: Display backend health in settings placeholder**

Replace `mobile/app/(tabs)/settings.tsx` with:

```tsx
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";

import { getHealth } from "@/api/health";
import { AppScreen } from "@/components/AppScreen";

export default function SettingsScreen() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: false
  });

  return (
    <AppScreen>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>设置</Text>
      <Text>账户、主题、提醒管理、帮助与关于将在设置里程碑实现。</Text>
      <Text>API 状态：{healthQuery.data?.status ?? "未连接"}</Text>
      {healthQuery.error ? <Text>API 连接失败，请确认后端已启动。</Text> : null}
    </AppScreen>
  );
}
```

- [ ] **Step 5: Run backend server**

Run:

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload
```

Expected: backend listens on `http://127.0.0.1:8000`.

- [ ] **Step 6: Run mobile typecheck**

In another terminal, run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

- [ ] **Step 7: Run mobile app and verify health display**

Run:

```bash
cd mobile
npm run start
```

Expected: Expo starts. Open the app, enter the temporary tabs route from the login screen, open 「设置」, and verify it displays `API 状态：ok` when the backend is running.

- [ ] **Step 8: Commit mobile API client**

If using git, run:

```bash
git add mobile/src/api mobile/src/types mobile/app/'(tabs)'/settings.tsx
git commit -m "feat: connect mobile app to backend health endpoint"
```

Expected: git creates one commit.

---

### Task 8: Add Feature Type Placeholders and Token Storage Abstraction

**Files:**
- Create: `mobile/src/storage/tokenStorage.ts`
- Create: `mobile/src/features/auth/types.ts`
- Create: `mobile/src/features/recipes/types.ts`
- Create: `mobile/src/features/families/types.ts`
- Create: `mobile/src/features/orders/types.ts`
- Create: `mobile/src/features/notifications/types.ts`
- Create: `mobile/src/features/settings/types.ts`

- [ ] **Step 1: Create token storage abstraction**

Create `mobile/src/storage/tokenStorage.ts` with:

```ts
import * as SecureStore from "expo-secure-store";

const accessTokenKey = "cook_picture_access_token";

export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(accessTokenKey, token);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(accessTokenKey);
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(accessTokenKey);
}
```

- [ ] **Step 2: Create auth types**

Create `mobile/src/features/auth/types.ts` with:

```ts
export type User = {
  id: number;
  email: string | null;
  phone: string | null;
  nickname: string;
  avatar_image_id: number | null;
};

export type AuthSession = {
  access_token: string;
  token_type: "bearer";
  user: User;
};
```

- [ ] **Step 3: Create recipe types**

Create `mobile/src/features/recipes/types.ts` with:

```ts
export type RecipeStep = {
  id: number;
  step_no: number;
  instruction: string;
  image_id: number | null;
  estimated_minutes: number | null;
};

export type Recipe = {
  id: number;
  title: string;
  creator_name: string;
  description: string | null;
  main_image_id: number | null;
  tags: string[];
  steps: RecipeStep[];
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 4: Create family types**

Create `mobile/src/features/families/types.ts` with:

```ts
export type FamilyRole = "admin" | "member";

export type Family = {
  id: number;
  name: string;
  description: string | null;
  avatar_image_id: number | null;
  cover_image_id: number | null;
  role: FamilyRole;
};

export type FamilyMember = {
  id: number;
  user_id: number;
  nickname: string;
  avatar_image_id: number | null;
  role: FamilyRole;
  joined_at: string;
};
```

- [ ] **Step 5: Create order types**

Create `mobile/src/features/orders/types.ts` with:

```ts
export type MealSlot =
  | "breakfast"
  | "morning_tea"
  | "lunch"
  | "afternoon_tea"
  | "dinner"
  | "late_night_snack";

export type CookingOrderStatus = "pending_acceptance" | "accepted" | "completed" | "cancelled";

export type CookingOrder = {
  id: number;
  family_id: number;
  recipe_id: number;
  recipe_title_snapshot: string;
  recipe_image_snapshot_url: string | null;
  requester_user_id: number;
  assignee_user_id: number;
  meal_slot: MealSlot;
  scheduled_date: string;
  scheduled_time: string | null;
  note: string | null;
  status: CookingOrderStatus;
  reminder_time: string | null;
};
```

- [ ] **Step 6: Create notification types**

Create `mobile/src/features/notifications/types.ts` with:

```ts
export type NotificationType =
  | "order_assigned"
  | "order_accepted"
  | "order_completed"
  | "order_cancelled"
  | "family_joined";

export type AppNotification = {
  id: number;
  recipient_user_id: number;
  family_id: number | null;
  order_id: number | null;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};
```

- [ ] **Step 7: Create settings types**

Create `mobile/src/features/settings/types.ts` with:

```ts
export type UserSettings = {
  theme_mode: "light" | "dark";
  primary_color: string;
  default_reminder_minutes: number;
  notifications_enabled: boolean;
};
```

- [ ] **Step 8: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

- [ ] **Step 9: Commit shared mobile foundations**

If using git, run:

```bash
git add mobile/src/storage mobile/src/features
git commit -m "feat: add mobile feature type foundations"
```

Expected: git creates one commit.

---

### Task 9: Add Foundation Verification Script Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with setup commands**

Replace `README.md` with:

```markdown
# Cook Picture

Cook Picture is a lightweight mobile app for personal recipes, family recipe sharing, family meal requests, cooking assignments, and local cooking reminders.

## Apps

- `mobile/`: React Native + Expo mobile app.
- `backend/`: FastAPI API server.

## MVP Milestones

1. Project foundation.
2. Registration, login, and account settings.
3. Recipes and image uploads.
4. Families and shared recipes.
5. Orders, task lists, and in-app notifications.
6. Local reminders and settings.

## Backend Development

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected response:

```json
{"status":"ok","app_name":"Cook Picture API","environment":"development"}
```

Run backend tests:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

## Mobile Development

```bash
cd mobile
npm install
npm run start
```

Typecheck:

```bash
cd mobile
npm run typecheck
```

## Foundation Verification

1. Start the backend with `uvicorn app.main:app --reload`.
2. Confirm `/api/v1/health` returns `status: ok`.
3. Start the mobile app with `npm run start`.
4. Open the temporary app route from the login screen.
5. Open 「设置」 and confirm `API 状态：ok` appears.
```

- [ ] **Step 2: Run full backend tests**

Run:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected: all backend tests pass.

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd mobile
npm run typecheck
```

Expected: TypeScript completes without errors.

- [ ] **Step 4: Commit setup documentation**

If using git, run:

```bash
git add README.md
git commit -m "docs: document foundation setup"
```

Expected: git creates one commit.

---

## Final Verification

Run these commands from a clean terminal after all tasks are complete:

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected: all tests pass.

```bash
cd mobile
npm run typecheck
```

Expected: no TypeScript errors.

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload
```

Expected: server starts on `http://127.0.0.1:8000`.

In another terminal:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected:

```json
{"status":"ok","app_name":"Cook Picture API","environment":"development"}
```

Then run:

```bash
cd mobile
npm run start
```

Expected: Expo starts, app opens, and 「设置」 displays `API 状态：ok` when the backend is running.

## Spec Coverage Review

This plan covers these requirements from the approved spec:

- React Native + Expo frontend foundation.
- FastAPI backend foundation.
- MySQL-ready database configuration.
- Alembic migration foundation.
- API health check.
- Frontend API client foundation.
- Theme customization data foundation.
- Feature directory boundaries for auth, recipes, families, orders, notifications, and settings.
- Token storage abstraction for future login.

Requirements intentionally deferred to later milestone plans:

- User registration and login.
- Recipe CRUD and image uploads.
- Family creation and invite-code joining.
- Family recipe sharing.
- Ordering, task status transitions, and notifications.
- Local reminder scheduling.
- Account, theme, reminder, help, and about settings pages.
- Production deployment.
