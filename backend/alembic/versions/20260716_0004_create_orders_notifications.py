"""create orders and notifications

Revision ID: 20260716_0004
Revises: 20260715_0003
Create Date: 2026-07-16

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260716_0004"
down_revision: str | None = "20260715_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cooking_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("family_id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("recipe_title_snapshot", sa.String(length=120), nullable=False),
        sa.Column("recipe_image_snapshot_url", sa.String(length=500), nullable=True),
        sa.Column("requester_user_id", sa.Integer(), nullable=False),
        sa.Column("assignee_user_id", sa.Integer(), nullable=False),
        sa.Column("meal_slot", sa.String(length=32), nullable=False),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("scheduled_time", sa.Time(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_reason", sa.String(length=300), nullable=True),
        sa.Column("reminder_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assignee_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cooking_orders_assignee_user_id"), "cooking_orders", ["assignee_user_id"], unique=False)
    op.create_index(op.f("ix_cooking_orders_family_id"), "cooking_orders", ["family_id"], unique=False)
    op.create_index(op.f("ix_cooking_orders_id"), "cooking_orders", ["id"], unique=False)
    op.create_index(op.f("ix_cooking_orders_meal_slot"), "cooking_orders", ["meal_slot"], unique=False)
    op.create_index(op.f("ix_cooking_orders_recipe_id"), "cooking_orders", ["recipe_id"], unique=False)
    op.create_index(op.f("ix_cooking_orders_requester_user_id"), "cooking_orders", ["requester_user_id"], unique=False)
    op.create_index(op.f("ix_cooking_orders_scheduled_date"), "cooking_orders", ["scheduled_date"], unique=False)
    op.create_index(op.f("ix_cooking_orders_status"), "cooking_orders", ["status"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipient_user_id", sa.Integer(), nullable=False),
        sa.Column("family_id", sa.Integer(), nullable=True),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["cooking_orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"], unique=False)
    op.create_index(op.f("ix_notifications_family_id"), "notifications", ["family_id"], unique=False)
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_is_read"), "notifications", ["is_read"], unique=False)
    op.create_index(op.f("ix_notifications_order_id"), "notifications", ["order_id"], unique=False)
    op.create_index(op.f("ix_notifications_recipient_user_id"), "notifications", ["recipient_user_id"], unique=False)
    op.create_index(op.f("ix_notifications_type"), "notifications", ["type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_recipient_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_order_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_is_read"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_family_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_table("notifications")
    op.drop_index(op.f("ix_cooking_orders_status"), table_name="cooking_orders")
    op.drop_index(op.f("ix_cooking_orders_scheduled_date"), table_name="cooking_orders")
    op.drop_index(op.f("ix_cooking_orders_requester_user_id"), table_name="cooking_orders")
    op.drop_index(op.f("ix_cooking_orders_recipe_id"), table_name="cooking_orders")
    op.drop_index(op.f("ix_cooking_orders_meal_slot"), table_name="cooking_orders")
    op.drop_index(op.f("ix_cooking_orders_id"), table_name="cooking_orders")
    op.drop_index(op.f("ix_cooking_orders_family_id"), table_name="cooking_orders")
    op.drop_index(op.f("ix_cooking_orders_assignee_user_id"), table_name="cooking_orders")
    op.drop_table("cooking_orders")
