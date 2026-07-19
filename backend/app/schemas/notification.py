from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    id: int
    recipient_user_id: int
    family_id: int | None = None
    order_id: int | None = None
    type: str
    title: str
    body: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationReadAllResult(BaseModel):
    updated_count: int
