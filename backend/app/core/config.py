from functools import lru_cache
from typing import Any, Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cook Picture API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "mysql+pymysql://cook_picture:change_me@127.0.0.1:3306/cook_picture"
    jwt_secret_key: str = "change-this-secret-before-production"
    access_token_expire_minutes: int = 1440
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:8082",
            "http://127.0.0.1:8082",
        ]
    )
    storage_provider: str = "local"
    local_upload_dir: str = "uploads"
    public_base_url: str = "http://127.0.0.1:8000"
    feedback_recipient_email: str = "2524481779@qq.com"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    auto_create_tables: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        enable_decoding=False,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> Any:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def validate_production_secret(self) -> Self:
        if (
            self.environment != "development"
            and self.jwt_secret_key == "change-this-secret-before-production"
        ):
            raise ValueError(
                "JWT_SECRET_KEY must be changed from the development placeholder "
                "outside the development environment."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
