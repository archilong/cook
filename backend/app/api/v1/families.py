from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.family import (
    FamilyCreate,
    FamilyJoin,
    FamilyMemberRead,
    FamilyRead,
    FamilyRecipeCreate,
    FamilyRecipeRead,
    FamilyUpdate,
)
from app.services.family_service import (
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    create_family,
    get_family,
    join_family,
    list_family_members,
    list_family_recipes,
    list_my_families,
    refresh_invite_code,
    remove_family_member,
    remove_family_recipe,
    share_recipe_to_family,
    update_family,
)

router = APIRouter(prefix="/families", tags=["families"])


def _map_service_error(exc: ValueError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, PermissionDeniedError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if isinstance(exc, BadRequestError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[FamilyRead])
def list_families(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[FamilyRead]:
    return list_my_families(db, current_user)


@router.post("", response_model=FamilyRead, status_code=status.HTTP_201_CREATED)
def create_family_endpoint(
    request: FamilyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    return create_family(db, current_user, request)


@router.post("/join", response_model=FamilyRead)
def join_family_endpoint(
    request: FamilyJoin,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return join_family(db, current_user, request)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.get("/{family_id}", response_model=FamilyRead)
def get_family_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return get_family(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.patch("/{family_id}", response_model=FamilyRead)
def update_family_endpoint(
    family_id: int,
    request: FamilyUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return update_family(db, current_user, family_id, request)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/{family_id}/invite-code/refresh", response_model=FamilyRead)
def refresh_invite_code_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRead:
    try:
        return refresh_invite_code(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.get("/{family_id}/members", response_model=list[FamilyMemberRead])
def list_family_members_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[FamilyMemberRead]:
    try:
        return list_family_members(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.get("/{family_id}/recipes", response_model=list[FamilyRecipeRead])
def list_family_recipes_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[FamilyRecipeRead]:
    try:
        return list_family_recipes(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/{family_id}/recipes", response_model=FamilyRecipeRead, status_code=status.HTTP_201_CREATED)
def share_recipe_to_family_endpoint(
    family_id: int,
    request: FamilyRecipeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyRecipeRead:
    try:
        return share_recipe_to_family(db, current_user, family_id, request.recipe_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.delete("/{family_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_family_recipe_endpoint(
    family_id: int,
    recipe_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        remove_family_recipe(db, current_user, family_id, recipe_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{family_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_family_member_endpoint(
    family_id: int,
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        remove_family_member(db, current_user, family_id, user_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
