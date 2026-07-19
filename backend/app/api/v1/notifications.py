from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.notification import NotificationRead, NotificationReadAllResult
from app.services.family_service import NotFoundError
from app.services.notification_service import list_notifications, mark_all_notifications_read, mark_notification_read

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _map_service_error(exc: ValueError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[NotificationRead])
def list_notifications_endpoint(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[NotificationRead]:
    return list_notifications(db, current_user)


@router.post("/read-all", response_model=NotificationReadAllResult)
def mark_all_notifications_read_endpoint(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> NotificationReadAllResult:
    return mark_all_notifications_read(db, current_user)


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read_endpoint(
    notification_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> NotificationRead:
    try:
        return mark_notification_read(db, current_user, notification_id)
    except ValueError as exc:
        raise _map_service_error(exc) from exc
