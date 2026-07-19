"""create images and recipes

Revision ID: 20260715_0002
Revises: 20260715_0001
Create Date: 2026-07-15

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260715_0002"
down_revision: str | None = "20260715_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("storage_provider", sa.String(length=32), nullable=False),
        sa.Column("bucket", sa.String(length=255), nullable=True),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("public_url", sa.String(length=1024), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_images_id"), "images", ["id"], unique=False)
    op.create_index(op.f("ix_images_owner_user_id"), "images", ["owner_user_id"], unique=False)

    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("creator_name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("main_image_id", sa.Integer(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["main_image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recipes_id"), "recipes", ["id"], unique=False)
    op.create_index(op.f("ix_recipes_owner_user_id"), "recipes", ["owner_user_id"], unique=False)
    op.create_index(op.f("ix_recipes_status"), "recipes", ["status"], unique=False)
    op.create_index(op.f("ix_recipes_title"), "recipes", ["title"], unique=False)

    op.create_table(
        "recipe_steps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("step_no", sa.Integer(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("image_id", sa.Integer(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("recipe_id", "step_no", name="uq_recipe_steps_recipe_step_no"),
    )
    op.create_index(op.f("ix_recipe_steps_id"), "recipe_steps", ["id"], unique=False)
    op.create_index(op.f("ix_recipe_steps_recipe_id"), "recipe_steps", ["recipe_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_recipe_steps_recipe_id"), table_name="recipe_steps")
    op.drop_index(op.f("ix_recipe_steps_id"), table_name="recipe_steps")
    op.drop_table("recipe_steps")
    op.drop_index(op.f("ix_recipes_title"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_status"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_owner_user_id"), table_name="recipes")
    op.drop_index(op.f("ix_recipes_id"), table_name="recipes")
    op.drop_table("recipes")
    op.drop_index(op.f("ix_images_owner_user_id"), table_name="images")
    op.drop_index(op.f("ix_images_id"), table_name="images")
    op.drop_table("images")
