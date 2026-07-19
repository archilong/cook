from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.order import CookingOrderCancel, CookingOrderCreate, CookingOrderRead, CookingOrderReminderUpdate
from app.services.family_service import BadRequestError, NotFoundError, PermissionDeniedError
from app.services.order_service import (
    accept_order,
    cancel_order,
    complete_order,
    create_order,
    get_order,
    list_family_orders,
    list_my_orders,
    update_order_reminder,
)

router = APIRouter(tags=["orders"])


def _map_service_error(exc: ValueError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, PermissionDeniedError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if isinstance(exc, BadRequestError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/families/{family_id}/orders", response_model=list[CookingOrderRead])
def list_family_orders_endpoint(
    family_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[CookingOrderRead]:
    try:
        return list_family_orders(db, current_user, family_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/families/{family_id}/orders", response_model=CookingOrderRead, status_code=status.HTTP_201_CREATED)
def create_order_endpoint(
    family_id: int,
    request: CookingOrderCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CookingOrderRead:
    try:
        return create_order(db, current_user, family_id, request)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.get("/orders", response_model=list[CookingOrderRead])
def list_my_orders_endpoint(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[CookingOrderRead]:
    return list_my_orders(db, current_user)


@router.get("/orders/{order_id}", response_model=CookingOrderRead)
def get_order_endpoint(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CookingOrderRead:
    try:
        return get_order(db, current_user, order_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/orders/{order_id}/accept", response_model=CookingOrderRead)
def accept_order_endpoint(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CookingOrderRead:
    try:
        return accept_order(db, current_user, order_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/orders/{order_id}/complete", response_model=CookingOrderRead)
def complete_order_endpoint(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CookingOrderRead:
    try:
        return complete_order(db, current_user, order_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.post("/orders/{order_id}/cancel", response_model=CookingOrderRead)
def cancel_order_endpoint(
    order_id: int,
    request: CookingOrderCancel,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CookingOrderRead:
    try:
        return cancel_order(db, current_user, order_id, request)
    except ValueError as exc:
        raise _map_service_error(exc) from exc


@router.patch("/orders/{order_id}/reminder", response_model=CookingOrderRead)
def update_order_reminder_endpoint(
    order_id: int,
    request: CookingOrderReminderUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CookingOrderRead:
    try:
        return update_order_reminder(db, current_user, order_id, request)
    except ValueError as exc:
        raise _map_service_error(exc) from exc
