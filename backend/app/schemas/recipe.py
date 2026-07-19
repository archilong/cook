from datetime import datetime

from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.image import ImageRead


class RecipeStepCreate(BaseModel):
    step_no: int = Field(ge=1)
    instruction: str = Field(min_length=1)
    image_id: int | None = None
    estimated_minutes: int | None = Field(default=None, ge=0)


class RecipeStepRead(BaseModel):
    id: int
    step_no: int
    instruction: str
    image_id: int | None = None
    estimated_minutes: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecipeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    creator_name: str = Field(min_length=1, max_length=80)
    description: str | None = None
    main_image_id: int | None = None
    tags: list[str] = Field(default_factory=list)
    steps: list[RecipeStepCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_step_numbers(self) -> Self:
        step_numbers = [step.step_no for step in self.steps]
        if len(step_numbers) != len(set(step_numbers)):
            raise ValueError("step_no values must be unique")
        return self


class RecipeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    creator_name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    main_image_id: int | None = None
    tags: list[str] | None = None
    steps: list[RecipeStepCreate] | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_unique_step_numbers(self) -> Self:
        if self.steps is None:
            return self
        step_numbers = [step.step_no for step in self.steps]
        if len(step_numbers) != len(set(step_numbers)):
            raise ValueError("step_no values must be unique")
        return self


class RecipeRead(BaseModel):
    id: int
    title: str
    creator_name: str
    description: str | None = None
    main_image_id: int | None = None
    main_image: ImageRead | None = None
    tags: list[str]
    steps: list[RecipeStepRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
