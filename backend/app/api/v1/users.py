from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.user import PasswordUpdate, UserRead, UserUpdate
from app.schemas.user_settings import UserSettingsRead, UserSettingsUpdate
from app.services.user_service import (
    get_or_create_user_settings,
    update_user_password,
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


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_my_password(
    request: PasswordUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    update_user_password(db, current_user, request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
