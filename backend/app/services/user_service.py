from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User, UserSettings
from app.schemas.user import PasswordUpdate, UserUpdate
from app.schemas.user_settings import UserSettingsUpdate


def update_user_profile(db: Session, user: User, request: UserUpdate) -> User:
    data = request.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: User, request: PasswordUpdate) -> None:
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码不正确。",
        )

    user.password_hash = hash_password(request.new_password)
    db.commit()


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
    data = request.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in data.items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
