import importlib
from types import ModuleType

import pytest
from fastapi.testclient import TestClient


def load_config(monkeypatch: pytest.MonkeyPatch, **env: str) -> ModuleType:
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    config = importlib.import_module("app.core.config")
    config.get_settings.cache_clear()
    return importlib.reload(config)


def test_health_check_returns_app_status(monkeypatch: pytest.MonkeyPatch) -> None:
    load_config(
        monkeypatch,
        APP_NAME="Cook Picture API",
        ENVIRONMENT="development",
        JWT_SECRET_KEY="change-this-secret-before-production",
        CORS_ORIGINS="http://localhost:8081,http://127.0.0.1:8081",
    )
    main = importlib.import_module("app.main")
    main = importlib.reload(main)
    client = TestClient(main.app)

    response = client.get("/api/v1/health")

    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["app_name"] == "Cook Picture API"
    assert body["environment"] == "development"


def test_root_health_check_returns_app_status(monkeypatch: pytest.MonkeyPatch) -> None:
    load_config(
        monkeypatch,
        APP_NAME="Cook Picture API",
        ENVIRONMENT="development",
        JWT_SECRET_KEY="change-this-secret-before-production",
    )
    main = importlib.import_module("app.main")
    main = importlib.reload(main)
    client = TestClient(main.app)

    response = client.get("/")

    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["app_name"] == "Cook Picture API"
    assert body["environment"] == "development"


def test_settings_parse_comma_separated_cors_origins_from_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = load_config(
        monkeypatch,
        CORS_ORIGINS="http://localhost:8081,http://127.0.0.1:8081",
    )

    settings = config.Settings()

    assert settings.cors_origins == ["http://localhost:8081", "http://127.0.0.1:8081"]


def test_settings_parse_comma_separated_cors_origins_from_constructor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = load_config(monkeypatch)

    settings = config.Settings(cors_origins="http://localhost:8081, http://127.0.0.1:8081")

    assert settings.cors_origins == ["http://localhost:8081", "http://127.0.0.1:8081"]


def test_settings_preserve_cors_origins_list(monkeypatch: pytest.MonkeyPatch) -> None:
    config = load_config(monkeypatch)

    settings = config.Settings(cors_origins=["http://localhost:8081"])

    assert settings.cors_origins == ["http://localhost:8081"]


def test_development_cors_allows_dynamic_expo_ports(monkeypatch: pytest.MonkeyPatch) -> None:
    load_config(
        monkeypatch,
        APP_NAME="Cook Picture API",
        ENVIRONMENT="development",
        JWT_SECRET_KEY="change-this-secret-before-production",
    )
    main = importlib.import_module("app.main")
    main = importlib.reload(main)
    client = TestClient(main.app)

    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:8086",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8086"


def test_settings_reject_placeholder_jwt_secret_outside_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = load_config(monkeypatch)

    with pytest.raises(ValueError, match="JWT_SECRET_KEY must be changed"):
        config.Settings(
            environment="production",
            jwt_secret_key="change-this-secret-before-production",
        )
