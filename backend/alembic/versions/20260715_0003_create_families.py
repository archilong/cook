"""create families

Revision ID: 20260715_0003
Revises: 20260715_0002
Create Date: 2026-07-15

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260715_0003"
down_revision: str | None = "20260715_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "families",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("avatar_image_id", sa.Integer(), nullable=True),
        sa.Column("cover_image_id", sa.Integer(), nullable=True),
        sa.Column("invite_code", sa.String(length=32), nullable=False),
        sa.Column("invite_code_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("theme_config", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["avatar_image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["cover_image_id"], ["images.id"]),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invite_code"),
    )
    op.create_index(op.f("ix_families_id"), "families", ["id"], unique=False)
    op.create_index(op.f("ix_families_invite_code"), "families", ["invite_code"], unique=False)
    op.create_index(op.f("ix_families_name"), "families", ["name"], unique=False)
    op.create_index(op.f("ix_families_owner_user_id"), "families", ["owner_user_id"], unique=False)

    op.create_table(
        "family_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("family_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("nickname_in_family", sa.String(length=80), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("family_id", "user_id", name="uq_family_members_family_user"),
    )
    op.create_index(op.f("ix_family_members_family_id"), "family_members", ["family_id"], unique=False)
    op.create_index(op.f("ix_family_members_id"), "family_members", ["id"], unique=False)
    op.create_index(op.f("ix_family_members_role"), "family_members", ["role"], unique=False)
    op.create_index(op.f("ix_family_members_status"), "family_members", ["status"], unique=False)
    op.create_index(op.f("ix_family_members_user_id"), "family_members", ["user_id"], unique=False)

    op.create_table(
        "family_recipes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("family_id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("shared_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shared_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("family_id", "recipe_id", name="uq_family_recipes_family_recipe"),
    )
    op.create_index(op.f("ix_family_recipes_family_id"), "family_recipes", ["family_id"], unique=False)
    op.create_index(op.f("ix_family_recipes_id"), "family_recipes", ["id"], unique=False)
    op.create_index(op.f("ix_family_recipes_recipe_id"), "family_recipes", ["recipe_id"], unique=False)
    op.create_index(op.f("ix_family_recipes_shared_by_user_id"), "family_recipes", ["shared_by_user_id"], unique=False)
    op.create_index(op.f("ix_family_recipes_status"), "family_recipes", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_family_recipes_status"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_shared_by_user_id"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_recipe_id"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_id"), table_name="family_recipes")
    op.drop_index(op.f("ix_family_recipes_family_id"), table_name="family_recipes")
    op.drop_table("family_recipes")
    op.drop_index(op.f("ix_family_members_user_id"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_status"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_role"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_id"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_family_id"), table_name="family_members")
    op.drop_table("family_members")
    op.drop_index(op.f("ix_families_owner_user_id"), table_name="families")
    op.drop_index(op.f("ix_families_name"), table_name="families")
    op.drop_index(op.f("ix_families_invite_code"), table_name="families")
    op.drop_index(op.f("ix_families_id"), table_name="families")
    op.drop_table("families")
