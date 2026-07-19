from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User, UserSettings
from app.schemas.auth import LoginRequest, RegisterRequest


def register_user(db: Session, request: RegisterRequest) -> User:
    if not request.email and not request.phone:
        raise ValueError("email or phone is required")

    email = str(request.email) if request.email else None
    phone = request.phone
    identifier_checks = []
    if email:
        identifier_checks.extend([User.email == email, User.phone == email])
    if phone:
        identifier_checks.extend([User.phone == phone, User.email == phone])

    existing = db.scalar(select(User).where(or_(*identifier_checks)))
    if existing:
        raise ValueError("user already registered")

    user = User(
        email=email,
        phone=phone,
        password_hash=hash_password(request.password),
        nickname=request.nickname,
    )
    db.add(user)
    db.flush()

    db.add(UserSettings(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, request: LoginRequest) -> User | None:
    user = db.scalar(
        select(User).where(or_(User.email == request.identifier, User.phone == request.identifier))
    )
    if not user:
        return None
    if user.status != "active":
        return None
    if not verify_password(request.password, user.password_hash):
        return None

    user.last_login_at = datetime.now(tz=UTC)
    db.commit()
    db.refresh(user)
    return user
