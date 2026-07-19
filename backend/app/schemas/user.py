from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserBase(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9]{3,32}$")
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


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)
