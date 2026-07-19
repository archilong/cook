from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.image import ImageRead
from app.services.image_service import create_image_from_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/images", response_model=ImageRead, status_code=status.HTTP_201_CREATED)
async def upload_image(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    purpose: Annotated[str, Form()] = "recipe_main",
    file: Annotated[UploadFile, File()] = ...,
) -> ImageRead:
    try:
        return await create_image_from_upload(db, current_user, file, purpose)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
