import re
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Image, User

ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
VALID_PURPOSE_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


def _normalize_purpose(purpose: str) -> str:
    normalized_purpose = purpose.strip() or "recipe_main"
    if not VALID_PURPOSE_PATTERN.fullmatch(normalized_purpose):
        raise ValueError("Invalid image purpose")
    return normalized_purpose


def _safe_suffix(filename: str | None, mime_type: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return suffix
    if mime_type == "image/png":
        return ".png"
    if mime_type == "image/webp":
        return ".webp"
    return ".jpg"


def _content_matches_mime_type(content: bytes, mime_type: str) -> bool:
    if mime_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False


async def create_image_from_upload(db: Session, user: User, file: UploadFile, purpose: str) -> Image:
    normalized_purpose = _normalize_purpose(purpose)
    if file.content_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValueError("Only JPEG, PNG, and WebP images are supported")
    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise ValueError("Image must be 5MB or smaller")
    if not _content_matches_mime_type(content, file.content_type):
        raise ValueError("Uploaded file content does not match its image type")
    suffix = _safe_suffix(file.filename, file.content_type)
    object_key = f"{normalized_purpose}/{uuid4().hex}{suffix}"
    upload_root = Path(settings.local_upload_dir)
    target = upload_root / object_key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    public_url = f"/static/uploads/{object_key}"

    image = Image(
        owner_user_id=user.id,
        storage_provider="local",
        object_key=object_key,
        public_url=public_url,
        mime_type=file.content_type,
        size_bytes=len(content),
        purpose=normalized_purpose,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image
