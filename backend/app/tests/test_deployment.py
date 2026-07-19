import importlib

from fastapi.testclient import TestClient
from pathlib import Path

from sqlalchemy import create_engine, inspect

from app.models import Base
from app.tests.test_health import load_config


def test_deployment_auto_create_tables_initializes_sqlite_database(monkeypatch, tmp_path) -> None:
    database_path = tmp_path / "cook_picture.db"
    database_url = f"sqlite:///{database_path.as_posix()}"

    load_config(
        monkeypatch,
        APP_NAME="Cook Picture API",
        ENVIRONMENT="development",
        JWT_SECRET_KEY="change-this-secret-before-production",
        DATABASE_URL=database_url,
        AUTO_CREATE_TABLES="true",
    )
    database = importlib.import_module("app.core.database")
    database = importlib.reload(database)
    main = importlib.import_module("app.main")
    importlib.reload(main)

    inspector = inspect(create_engine(database_url))

    assert set(Base.metadata.tables).issubset(set(inspector.get_table_names()))


def test_deployment_exposes_backend_health_only(monkeypatch, tmp_path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'cook_picture.db').as_posix()}"
    load_config(
        monkeypatch,
        APP_NAME="Cook Picture API",
        ENVIRONMENT="development",
        JWT_SECRET_KEY="change-this-secret-before-production",
        DATABASE_URL=database_url,
        AUTO_CREATE_TABLES="true",
    )
    database = importlib.import_module("app.core.database")
    importlib.reload(database)
    main = importlib.import_module("app.main")
    main = importlib.reload(main)
    client = TestClient(main.app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_sealos_docker_deployment_is_backend_only_with_persistent_sqlite() -> None:
    project_root = Path(__file__).resolve().parents[3]
    dockerfile = project_root / "Dockerfile"
    start_script = project_root / "start.sh"
    deployment_guide = project_root / "DEPLOY_SEALOS.md"

    assert dockerfile.is_file()
    assert start_script.is_file()
    assert deployment_guide.is_file()

    dockerfile_source = dockerfile.read_text(encoding="utf-8")
    start_script_source = start_script.read_text(encoding="utf-8")
    deployment_guide_source = deployment_guide.read_text(encoding="utf-8")

    assert "FROM python:" in dockerfile_source
    assert "DATABASE_URL=sqlite:////data/cook_picture.db" in dockerfile_source
    assert "LOCAL_UPLOAD_DIR=/data/uploads" in dockerfile_source
    assert "AUTO_CREATE_TABLES=true" in dockerfile_source
    assert "COPY backend ./backend" in dockerfile_source
    assert "COPY mobile" not in dockerfile_source
    assert "FROM node" not in dockerfile_source
    assert "FRONTEND_DIST_DIR" not in dockerfile_source
    assert "--port \"${PORT:-8000}\"" in start_script_source
    assert "Sealos" in deployment_guide_source
    assert "sqlite:////data/cook_picture.db" in deployment_guide_source
    assert "/data/uploads" in deployment_guide_source
    assert "/api/v1" in deployment_guide_source
