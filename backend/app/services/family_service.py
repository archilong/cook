from secrets import token_urlsafe

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import Family, FamilyMember, FamilyRecipe, Recipe, User
from app.schemas.family import FamilyCreate, FamilyJoin, FamilyUpdate


INVITE_CODE_COMMIT_RETRIES = 20


class NotFoundError(ValueError):
    pass


class PermissionDeniedError(ValueError):
    pass


class BadRequestError(ValueError):
    pass


def _generate_invite_code() -> str:
    return token_urlsafe(8).replace("-", "").replace("_", "")[:12].upper()


def _unique_invite_code(db: Session) -> str:
    for _ in range(20):
        code = _generate_invite_code()
        if db.scalar(select(Family.id).where(Family.invite_code == code)) is None:
            return code
    raise RuntimeError("Could not generate unique invite code")


def _active_member_statement(family_id: int, user_id: int) -> Select[tuple[FamilyMember]]:
    return select(FamilyMember).where(
        FamilyMember.family_id == family_id,
        FamilyMember.user_id == user_id,
        FamilyMember.status == "active",
    )


def get_active_member(db: Session, family_id: int, user: User) -> FamilyMember:
    member = db.scalar(_active_member_statement(family_id, user.id))
    if member is None:
        raise NotFoundError("Family not found")
    return member


def require_admin(db: Session, family_id: int, user: User) -> FamilyMember:
    member = get_active_member(db, family_id, user)
    if member.role != "admin":
        raise PermissionDeniedError("Admin permission required")
    return member


def _family_recipe_count(db: Session, family_id: int) -> int:
    return db.scalar(
        select(func.count(FamilyRecipe.id))
        .join(Recipe, Recipe.id == FamilyRecipe.recipe_id)
        .where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.status == "active",
            Recipe.status == "active",
        )
    ) or 0


def _family_member_count(db: Session, family_id: int) -> int:
    return db.scalar(
        select(func.count(FamilyMember.id)).where(
            FamilyMember.family_id == family_id, FamilyMember.status == "active"
        )
    ) or 0


def family_payload(db: Session, family: Family, role: str) -> dict:
    return {
        "id": family.id,
        "name": family.name,
        "description": family.description,
        "owner_user_id": family.owner_user_id,
        "avatar_image_id": family.avatar_image_id,
        "cover_image_id": family.cover_image_id,
        "invite_code": family.invite_code if role == "admin" else None,
        "role": role,
        "member_count": _family_member_count(db, family.id),
        "recipe_count": _family_recipe_count(db, family.id),
        "created_at": family.created_at,
        "updated_at": family.updated_at,
    }


def create_family(db: Session, user: User, request: FamilyCreate) -> dict:
    for _ in range(INVITE_CODE_COMMIT_RETRIES):
        family = Family(
            name=request.name,
            description=request.description,
            owner_user_id=user.id,
            invite_code=_unique_invite_code(db),
            theme_config={},
        )
        db.add(family)
        try:
            db.flush()
            db.add(
                FamilyMember(family_id=family.id, user_id=user.id, role="admin", status="active")
            )
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        db.refresh(family)
        return family_payload(db, family, "admin")
    raise RuntimeError("Could not create family with unique invite code")


def list_my_families(db: Session, user: User) -> list[dict]:
    statement = (
        select(Family, FamilyMember.role)
        .join(FamilyMember, FamilyMember.family_id == Family.id)
        .where(FamilyMember.user_id == user.id, FamilyMember.status == "active")
        .order_by(FamilyMember.joined_at.desc(), Family.id.desc())
    )
    return [family_payload(db, family, role) for family, role in db.execute(statement).all()]


def get_family(db: Session, user: User, family_id: int) -> dict:
    member = get_active_member(db, family_id, user)
    family = db.get(Family, family_id)
    if family is None:
        raise NotFoundError("Family not found")
    return family_payload(db, family, member.role)


def update_family(db: Session, user: User, family_id: int, request: FamilyUpdate) -> dict:
    admin = require_admin(db, family_id, user)
    family = db.get(Family, family_id)
    if family is None:
        raise NotFoundError("Family not found")
    update_data = request.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(family, field_name, value)
    db.commit()
    db.refresh(family)
    return family_payload(db, family, admin.role)


def join_family(db: Session, user: User, request: FamilyJoin) -> dict:
    family = db.scalar(select(Family).where(Family.invite_code == request.invite_code.strip().upper()))
    if family is None:
        raise NotFoundError("Invite code not found")
    member = db.scalar(
        select(FamilyMember).where(FamilyMember.family_id == family.id, FamilyMember.user_id == user.id)
    )
    if member is None:
        member = FamilyMember(family_id=family.id, user_id=user.id, role="member", status="active")
        db.add(member)
    elif member.status == "removed":
        raise PermissionDeniedError("Member has been removed from this family")
    else:
        member.status = "active"
        if member.role not in {"admin", "member"}:
            member.role = "member"
    db.commit()
    db.refresh(family)
    db.refresh(member)
    return family_payload(db, family, member.role)


def refresh_invite_code(db: Session, user: User, family_id: int) -> dict:
    admin = require_admin(db, family_id, user)
    family = db.get(Family, family_id)
    if family is None:
        raise NotFoundError("Family not found")
    for _ in range(INVITE_CODE_COMMIT_RETRIES):
        family.invite_code = _unique_invite_code(db)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            family = db.get(Family, family_id)
            if family is None:
                raise NotFoundError("Family not found") from None
            continue
        db.refresh(family)
        return family_payload(db, family, admin.role)
    raise RuntimeError("Could not refresh unique invite code")


def list_family_members(db: Session, user: User, family_id: int) -> list[dict]:
    get_active_member(db, family_id, user)
    statement = (
        select(FamilyMember)
        .options(selectinload(FamilyMember.user))
        .where(FamilyMember.family_id == family_id, FamilyMember.status == "active")
        .order_by(FamilyMember.role, FamilyMember.joined_at)
    )
    members = db.scalars(statement).all()
    return [
        {
            "id": member.id,
            "user_id": member.user_id,
            "nickname": member.nickname_in_family or member.user.nickname,
            "avatar_image_id": member.user.avatar_image_id,
            "role": member.role,
            "joined_at": member.joined_at,
        }
        for member in members
    ]


def remove_family_member(db: Session, user: User, family_id: int, target_user_id: int) -> None:
    require_admin(db, family_id, user)
    if target_user_id == user.id:
        raise BadRequestError("Admin cannot remove self")
    target = db.scalar(_active_member_statement(family_id, target_user_id))
    if target is None:
        raise NotFoundError("Member not found")
    if target.role == "admin":
        raise BadRequestError("Cannot remove admin member")
    target.status = "removed"
    db.commit()


def _active_recipe_for_owner_statement(user: User, recipe_id: int) -> Select[tuple[Recipe]]:
    return (
        select(Recipe)
        .options(selectinload(Recipe.steps), selectinload(Recipe.main_image))
        .where(Recipe.id == recipe_id, Recipe.owner_user_id == user.id, Recipe.status == "active")
    )


def _family_recipe_payload(family_recipe: FamilyRecipe) -> dict:
    return {
        "id": family_recipe.id,
        "family_id": family_recipe.family_id,
        "recipe_id": family_recipe.recipe_id,
        "shared_by_user_id": family_recipe.shared_by_user_id,
        "shared_by_nickname": family_recipe.shared_by.nickname,
        "recipe": family_recipe.recipe,
        "created_at": family_recipe.created_at,
    }


def list_family_recipes(db: Session, user: User, family_id: int) -> list[dict]:
    get_active_member(db, family_id, user)
    statement = (
        select(FamilyRecipe)
        .options(
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.steps),
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.main_image),
            selectinload(FamilyRecipe.shared_by),
        )
        .join(Recipe, Recipe.id == FamilyRecipe.recipe_id)
        .where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.status == "active",
            Recipe.status == "active",
        )
        .order_by(FamilyRecipe.created_at.desc(), FamilyRecipe.id.desc())
    )
    return [_family_recipe_payload(family_recipe) for family_recipe in db.scalars(statement).all()]


def share_recipe_to_family(db: Session, user: User, family_id: int, recipe_id: int) -> dict:
    get_active_member(db, family_id, user)
    recipe = db.scalars(_active_recipe_for_owner_statement(user, recipe_id)).first()
    if recipe is None:
        raise NotFoundError("Recipe not found")
    family_recipe = db.scalar(
        select(FamilyRecipe).where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.recipe_id == recipe_id,
        )
    )
    if family_recipe is None:
        family_recipe = FamilyRecipe(
            family_id=family_id,
            recipe_id=recipe_id,
            shared_by_user_id=user.id,
            status="active",
        )
        db.add(family_recipe)
    else:
        family_recipe.shared_by_user_id = user.id
        family_recipe.status = "active"
    db.commit()
    statement = (
        select(FamilyRecipe)
        .options(
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.steps),
            selectinload(FamilyRecipe.recipe).selectinload(Recipe.main_image),
            selectinload(FamilyRecipe.shared_by),
        )
        .where(FamilyRecipe.id == family_recipe.id)
    )
    saved = db.scalar(statement)
    if saved is None:
        raise NotFoundError("Family recipe not found")
    return _family_recipe_payload(saved)


def remove_family_recipe(db: Session, user: User, family_id: int, recipe_id: int) -> None:
    member = get_active_member(db, family_id, user)
    family_recipe = db.scalar(
        select(FamilyRecipe)
        .options(selectinload(FamilyRecipe.recipe))
        .where(
            FamilyRecipe.family_id == family_id,
            FamilyRecipe.recipe_id == recipe_id,
            FamilyRecipe.status == "active",
        )
    )
    if family_recipe is None:
        raise NotFoundError("Family recipe not found")
    if member.role != "admin" and family_recipe.recipe.owner_user_id != user.id:
        raise PermissionDeniedError("Cannot remove this family recipe")
    family_recipe.status = "removed"
    db.commit()
