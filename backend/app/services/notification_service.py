from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Notification, User, UserSettings
from app.schemas.notification import NotificationReadAllResult
from app.services.family_service import NotFoundError


def create_notification(
    db: Session,
    *,
    recipient_user_id: int,
    family_id: int | None,
    order_id: int | None,
    type: str,
    title: str,
    body: str,
) -> Notification | None:
    settings = db.scalar(select(UserSettings).where(UserSettings.user_id == recipient_user_id))
    if settings is not None and not settings.notifications_enabled:
        return None
    notification = Notification(
        recipient_user_id=recipient_user_id,
        family_id=family_id,
        order_id=order_id,
        type=type,
        title=title,
        body=body,
        is_read=False,
    )
    db.add(notification)
    return notification


def list_notifications(db: Session, user: User) -> list[Notification]:
    statement = (
        select(Notification)
        .where(Notification.recipient_user_id == user.id)
        .order_by(Notification.is_read, Notification.created_at.desc(), Notification.id.desc())
        .limit(100)
    )
    return list(db.scalars(statement).all())


def mark_notification_read(db: Session, user: User, notification_id: int) -> Notification:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == user.id,
        )
    )
    if notification is None:
        raise NotFoundError("Notification not found")
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_notifications_read(db: Session, user: User) -> NotificationReadAllResult:
    now = datetime.now(timezone.utc)
    unread_ids = list(
        db.scalars(
            select(Notification.id).where(
                Notification.recipient_user_id == user.id,
                Notification.is_read.is_(False),
            )
        ).all()
    )
    if unread_ids:
        db.execute(
            update(Notification)
            .where(Notification.id.in_(unread_ids))
            .values(is_read=True, read_at=now)
        )
        db.commit()
    return NotificationReadAllResult(updated_count=len(unread_ids))
