from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.recipe import RecipeRead


class FamilyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class FamilyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None


class FamilyJoin(BaseModel):
    invite_code: str = Field(min_length=1, max_length=32)


class FamilyRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    owner_user_id: int
    avatar_image_id: int | None = None
    cover_image_id: int | None = None
    invite_code: str | None = None
    role: str
    member_count: int
    recipe_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FamilyMemberRead(BaseModel):
    id: int
    user_id: int
    nickname: str
    avatar_image_id: int | None = None
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FamilyRecipeCreate(BaseModel):
    recipe_id: int = Field(gt=0)


class FamilyRecipeRead(BaseModel):
    id: int
    family_id: int
    recipe_id: int
    shared_by_user_id: int
    shared_by_nickname: str
    recipe: RecipeRead
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
