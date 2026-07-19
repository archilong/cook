from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models import Image, Recipe, RecipeStep, User
from app.schemas.recipe import RecipeCreate, RecipeStepCreate, RecipeUpdate


def _active_owned_recipe_statement(user: User, recipe_id: int) -> Select[tuple[Recipe]]:
    return (
        select(Recipe)
        .options(selectinload(Recipe.steps), selectinload(Recipe.main_image))
        .where(
            Recipe.id == recipe_id,
            Recipe.owner_user_id == user.id,
            Recipe.status == "active",
        )
    )


def _replace_steps(recipe: Recipe, steps: list[RecipeStep]) -> None:
    recipe.steps.clear()
    recipe.steps.extend(steps)


def _step_models(request_steps: list[RecipeStepCreate]) -> list[RecipeStep]:
    return [
        RecipeStep(
            step_no=step.step_no,
            instruction=step.instruction,
            image_id=step.image_id,
            estimated_minutes=step.estimated_minutes,
        )
        for step in sorted(request_steps, key=lambda item: item.step_no)
    ]


def _referenced_image_ids(main_image_id: int | None, steps: list[RecipeStepCreate] | None) -> set[int]:
    image_ids = {main_image_id} if main_image_id is not None else set()
    if steps is not None:
        image_ids.update(step.image_id for step in steps if step.image_id is not None)
    return image_ids


def _validate_owned_images(
    db: Session,
    user: User,
    main_image_id: int | None,
    steps: list[RecipeStepCreate] | None,
) -> None:
    image_ids = _referenced_image_ids(main_image_id, steps)
    if not image_ids:
        return
    owned_ids = set(
        db.scalars(
            select(Image.id).where(Image.id.in_(image_ids), Image.owner_user_id == user.id)
        ).all()
    )
    if owned_ids != image_ids:
        raise ValueError("Image not found")


def create_recipe(db: Session, user: User, request: RecipeCreate) -> Recipe:
    _validate_owned_images(db, user, request.main_image_id, request.steps)
    recipe = Recipe(
        owner_user_id=user.id,
        title=request.title,
        creator_name=request.creator_name,
        description=request.description,
        main_image_id=request.main_image_id,
        tags=request.tags,
        status="active",
    )
    _replace_steps(recipe, _step_models(request.steps))
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    db.refresh(recipe, attribute_names=["steps"])
    return recipe


def list_my_recipes(db: Session, user: User) -> list[Recipe]:
    statement = (
        select(Recipe)
        .options(selectinload(Recipe.steps), selectinload(Recipe.main_image))
        .where(Recipe.owner_user_id == user.id, Recipe.status == "active")
        .order_by(Recipe.created_at.desc(), Recipe.id.desc())
    )
    return list(db.scalars(statement).all())


def get_my_recipe(db: Session, user: User, recipe_id: int) -> Recipe:
    recipe = db.scalars(_active_owned_recipe_statement(user, recipe_id)).first()
    if recipe is None:
        raise ValueError("Recipe not found")
    return recipe


def update_recipe(db: Session, user: User, recipe_id: int, request: RecipeUpdate) -> Recipe:
    recipe = get_my_recipe(db, user, recipe_id)
    _validate_owned_images(db, user, request.main_image_id, request.steps)
    update_data = request.model_dump(exclude_unset=True)
    steps = update_data.pop("steps", None)
    for field_name, value in update_data.items():
        setattr(recipe, field_name, value)
    if steps is not None:
        recipe.steps.clear()
        db.flush()
        recipe.steps.extend(_step_models(request.steps or []))
    db.commit()
    db.refresh(recipe)
    db.refresh(recipe, attribute_names=["steps"])
    return recipe


def delete_recipe(db: Session, user: User, recipe_id: int) -> None:
    recipe = get_my_recipe(db, user, recipe_id)
    recipe.status = "deleted"
    db.commit()
