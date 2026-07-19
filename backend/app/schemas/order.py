from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

MEAL_SLOTS = {"breakfast", "morning_tea", "lunch", "afternoon_tea", "dinner", "late_night_snack"}


class CookingOrderCreate(BaseModel):
    recipe_id: int = Field(gt=0)
    assignee_user_id: int = Field(gt=0)
    meal_slot: str
    scheduled_date: date
    scheduled_time: time | None = None
    note: str | None = Field(default=None, max_length=500)
    reminder_time: datetime | None = None

    @field_validator("meal_slot")
    @classmethod
    def validate_meal_slot(cls, value: str) -> str:
        if value not in MEAL_SLOTS:
            raise ValueError("Invalid meal slot")
        return value


class CookingOrderCancel(BaseModel):
    cancel_reason: str | None = Field(default=None, max_length=300)


class CookingOrderReminderUpdate(BaseModel):
    reminder_time: datetime | None = None


class CookingOrderRead(BaseModel):
    id: int
    family_id: int
    recipe_id: int
    recipe_title_snapshot: str
    recipe_image_snapshot_url: str | None = None
    requester_user_id: int
    requester_nickname: str
    assignee_user_id: int
    assignee_nickname: str
    is_requester: bool
    is_assignee: bool
    meal_slot: str
    scheduled_date: date
    scheduled_time: time | None = None
    note: str | None = None
    status: str
    accepted_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None
    reminder_time: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
