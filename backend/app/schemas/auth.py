from pydantic import BaseModel, EmailStr, Field, model_validator

from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9]{3,32}$")
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
