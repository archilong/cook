from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImageRead(BaseModel):
    id: int
    storage_provider: str
    object_key: str
    public_url: str
    mime_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    purpose: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
