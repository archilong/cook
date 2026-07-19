from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.family import Family
    from app.models.recipe import Recipe
    from app.models.user import User


class FamilyRecipe(Base):
    __tablename__ = "family_recipes"
    __table_args__ = (UniqueConstraint("family_id", "recipe_id", name="uq_family_recipes_family_recipe"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shared_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)

    family: Mapped["Family"] = relationship(back_populates="family_recipes")
    recipe: Mapped["Recipe"] = relationship()
    shared_by: Mapped["User"] = relationship()
