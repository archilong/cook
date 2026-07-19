from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.family_member import FamilyMember
    from app.models.family_recipe import FamilyRecipe


class Family(Base):
    __tablename__ = "families"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    avatar_image_id: Mapped[int | None] = mapped_column(ForeignKey("images.id"), nullable=True)
    cover_image_id: Mapped[int | None] = mapped_column(ForeignKey("images.id"), nullable=True)
    invite_code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    invite_code_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    theme_config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    members: Mapped[list["FamilyMember"]] = relationship(
        back_populates="family", cascade="all, delete-orphan"
    )
    family_recipes: Mapped[list["FamilyRecipe"]] = relationship(
        back_populates="family", cascade="all, delete-orphan"
    )
