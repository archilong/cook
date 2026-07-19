from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import CookingOrder, FamilyMember, FamilyRecipe, Recipe, User
from app.schemas.order import CookingOrderCancel, CookingOrderCreate, CookingOrderReminderUpdate
from app.services.family_service import BadRequestError, NotFoundError, PermissionDeniedError, get_active_member
from app.services.notification_service import create_notification

ORDER_STATUS_PENDING = "pending_acceptance"
ORDER_STATUS_ACCEPTED = "accepted"
ORDER_STATUS_COMPLETED = "completed"
ORDER_STATUS_CANCELLED = "cancelled"
TERMINAL_STATUSES = {ORDER_STATUS_COMPLETED, ORDER_STATUS_CANCELLED}


def _active_member_by_user_id(db: Session, family_id: int, user_id: int) -> FamilyMember:
    member = db.scalar(
        select(FamilyMember)
        .options(selectinload(FamilyMember.user))
        .where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == user_id,
            FamilyMember.status == "active",
        )
    )
    if member is None:
        raise NotFoundError("Member not found")
    return member


def _order_statement(order_id: int) -> select:
    return (
        select(CookingOrder)
        .options(
            selectinload(CookingOrder.requester),
            selectinload(CookingOrder.assignee),
        )
        .where(CookingOrder.id == order_id)
    )


def _get_visible_order(db: Session, user: User, order_id: int) -> CookingOrder:
    order = db.scalar(_order_statement(order_id))
    if order is None:
        raise NotFoundError("Order not found")
    get_active_member(db, order.family_id, user)
    return order


def _notify_order_event(db: Session, order: CookingOrder, *, recipient_user_id: int, type: str) -> None:
    if recipient_user_id == 0:
        return
    title_by_type = {
        "order_assigned": "新的点菜任务",
        "order_accepted": "点菜已接单",
        "order_completed": "点菜已完成",
        "order_cancelled": "点菜已取消",
    }
    body_by_type = {
        "order_assigned": f"{order.requester.nickname} 想吃 {order.recipe_title_snapshot}，请你来做。",
        "order_accepted": f"{order.assignee.nickname} 已接下 {order.recipe_title_snapshot}。",
        "order_completed": f"{order.assignee.nickname} 已完成 {order.recipe_title_snapshot}。",
        "order_cancelled": f"{order.requester.nickname} 取消了 {order.recipe_title_snapshot}。",
    }
    create_notification(
        db,
        recipient_user_id=recipient_user_id,
        family_id=order.family_id,
        order_id=order.id,
        type=type,
        title=title_by_type[type],
        body=body_by_type[type],
    )


def order_payload(order: CookingOrder, current_user: User) -> dict:
    return {
        "id": order.id,
        "family_id": order.family_id,
        "recipe_id": order.recipe_id,
        "recipe_title_snapshot": order.recipe_title_snapshot,
        "recipe_image_snapshot_url": order.recipe_image_snapshot_url,
        "requester_user_id": order.requester_user_id,
        "requester_nickname": order.requester.nickname,
        "assignee_user_id": order.assignee_user_id,
        "assignee_nickname": order.assignee.nickname,
        "is_requester": order.requester_user_id == current_user.id,
        "is_assignee": order.assignee_user_id == current_user.id,
        "meal_slot": order.meal_slot,
        "scheduled_date": order.scheduled_date,
        "scheduled_time": order.scheduled_time,
        "note": order.note,
        "status": order.status,
        "accepted_at": order.accepted_at,
        "completed_at": order.completed_at,
        "cancelled_at": order.cancelled_at,
        "cancel_reason": order.cancel_reason,
        "reminder_time": order.reminder_time,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }


def _refresh_order(db: Session, order_id: int) -> CookingOrder:
    order = db.scalar(_order_statement(order_id))
    if order is None:
        raise NotFoundError("Order not found")
    return order


def create_order(db: Session, user: User, family_id: int, request: CookingOrderCreate) -> dict:
    get_active_member(db, family_id, user)
    assignee_member = _active_member_by_user_id(db, family_id, request.assignee_user_id)
    family_recipe = db.scalar(
        select(FamilyRecipe)
        .options(
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.main_image),
        )
        .join(Recipe, Recipe.id == FamilyRecipe.recipe_id)
        .where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.recipe_id == request.recipe_id,
            FamilyRecipe.status == "active",
            Recipe.status == "active",
        )
    )
    if family_recipe is None:
        raise NotFoundError("Family recipe not found")
    recipe = family_recipe.recipe
    order = CookingOrder(
        family_id=family_id,
        recipe_id=recipe.id,
        recipe_title_snapshot=recipe.title,
        recipe_image_snapshot_url=recipe.main_image.public_url if recipe.main_image else None,
        requester_user_id=user.id,
        assignee_user_id=assignee_member.user_id,
        meal_slot=request.meal_slot,
        scheduled_date=request.scheduled_date,
        scheduled_time=request.scheduled_time,
        note=request.note,
        reminder_time=request.reminder_time,
        status=ORDER_STATUS_PENDING,
    )
    db.add(order)
    db.flush()
    order = _refresh_order(db, order.id)
    if order.assignee_user_id != order.requester_user_id:
        _notify_order_event(db, order, recipient_user_id=order.assignee_user_id, type="order_assigned")
    db.commit()
    order = _refresh_order(db, order.id)
    return order_payload(order, user)


def list_family_orders(db: Session, user: User, family_id: int) -> list[dict]:
    get_active_member(db, family_id, user)
    statement = (
        select(CookingOrder)
        .options(selectinload(CookingOrder.requester), selectinload(CookingOrder.assignee))
        .where(CookingOrder.family_id == family_id)
        .order_by(CookingOrder.scheduled_date.desc(), CookingOrder.created_at.desc(), CookingOrder.id.desc())
    )
    return [order_payload(order, user) for order in db.scalars(statement).all()]


def list_my_orders(db: Session, user: User) -> list[dict]:
    statement = (
        select(CookingOrder)
        .options(selectinload(CookingOrder.requester), selectinload(CookingOrder.assignee))
        .join(FamilyMember, FamilyMember.family_id == CookingOrder.family_id)
        .where(
            FamilyMember.user_id == user.id,
            FamilyMember.status == "active",
            or_(CookingOrder.requester_user_id == user.id, CookingOrder.assignee_user_id == user.id),
        )
        .order_by(CookingOrder.scheduled_date.desc(), CookingOrder.created_at.desc(), CookingOrder.id.desc())
    )
    return [order_payload(order, user) for order in db.scalars(statement).all()]


def get_order(db: Session, user: User, order_id: int) -> dict:
    order = _get_visible_order(db, user, order_id)
    return order_payload(order, user)


def accept_order(db: Session, user: User, order_id: int) -> dict:
    order = _get_visible_order(db, user, order_id)
    if order.assignee_user_id != user.id:
        raise PermissionDeniedError("Only assignee can accept this order")
    if order.status != ORDER_STATUS_PENDING:
        raise BadRequestError("Order cannot be accepted")
    order.status = ORDER_STATUS_ACCEPTED
    order.accepted_at = datetime.now(timezone.utc)
    db.flush()
    order = _refresh_order(db, order.id)
    if order.requester_user_id != order.assignee_user_id:
        _notify_order_event(db, order, recipient_user_id=order.requester_user_id, type="order_accepted")
    db.commit()
    order = _refresh_order(db, order.id)
    return order_payload(order, user)


def complete_order(db: Session, user: User, order_id: int) -> dict:
    order = _get_visible_order(db, user, order_id)
    if order.assignee_user_id != user.id:
        raise PermissionDeniedError("Only assignee can complete this order")
    if order.status != ORDER_STATUS_ACCEPTED:
        raise BadRequestError("Order cannot be completed")
    order.status = ORDER_STATUS_COMPLETED
    order.completed_at = datetime.now(timezone.utc)
    db.flush()
    order = _refresh_order(db, order.id)
    if order.requester_user_id != order.assignee_user_id:
        _notify_order_event(db, order, recipient_user_id=order.requester_user_id, type="order_completed")
    db.commit()
    order = _refresh_order(db, order.id)
    return order_payload(order, user)


def cancel_order(db: Session, user: User, order_id: int, request: CookingOrderCancel) -> dict:
    order = _get_visible_order(db, user, order_id)
    if order.requester_user_id != user.id:
        raise PermissionDeniedError("Only requester can cancel this order")
    if order.status in TERMINAL_STATUSES:
        raise BadRequestError("Order cannot be cancelled")
    order.status = ORDER_STATUS_CANCELLED
    order.cancelled_at = datetime.now(timezone.utc)
    order.cancel_reason = request.cancel_reason
    db.flush()
    order = _refresh_order(db, order.id)
    if order.requester_user_id != order.assignee_user_id:
        _notify_order_event(db, order, recipient_user_id=order.assignee_user_id, type="order_cancelled")
    db.commit()
    order = _refresh_order(db, order.id)
    return order_payload(order, user)


def update_order_reminder(db: Session, user: User, order_id: int, request: CookingOrderReminderUpdate) -> dict:
    order = _get_visible_order(db, user, order_id)
    if user.id not in {order.requester_user_id, order.assignee_user_id}:
        raise PermissionDeniedError("Cannot update this order reminder")
    if order.status in TERMINAL_STATUSES:
        raise BadRequestError("Cannot update reminder for finished order")
    order.reminder_time = request.reminder_time
    db.commit()
    order = _refresh_order(db, order.id)
    return order_payload(order, user)
