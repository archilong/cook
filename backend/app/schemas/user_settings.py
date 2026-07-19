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
