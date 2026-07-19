from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.recipe import RecipeCreate, RecipeRead, RecipeUpdate
from app.services.recipe_service import (
    create_recipe,
    delete_recipe,
    get_my_recipe,
    list_my_recipes,
    update_recipe,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _not_found(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("", response_model=list[RecipeRead])
def list_recipes(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[RecipeRead]:
    return list_my_recipes(db, current_user)


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create_recipe_endpoint(
    request: RecipeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecipeRead:
    try:
        return create_recipe(db, current_user, request)
    except ValueError as exc:
        raise _not_found(exc) from exc


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe_endpoint(
    recipe_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecipeRead:
    try:
        return get_my_recipe(db, current_user, recipe_id)
    except ValueError as exc:
        raise _not_found(exc) from exc


@router.patch("/{recipe_id}", response_model=RecipeRead)
def update_recipe_endpoint(
    recipe_id: int,
    request: RecipeUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RecipeRead:
    try:
        return update_recipe(db, current_user, recipe_id, request)
    except ValueError as exc:
        raise _not_found(exc) from exc


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe_endpoint(
    recipe_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        delete_recipe(db, current_user, recipe_id)
    except ValueError as exc:
        raise _not_found(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
