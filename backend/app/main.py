from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.auth import router as auth_router
from app.api.v1.families import router as families_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.health import router as health_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.orders import router as orders_router
from app.api.v1.recipes import router as recipes_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.core.config import settings
from app.core.database import engine
from app.models import Base


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=(
            r"^http://(localhost|127\.0\.0\.1):\d+$"
            if settings.environment == "development"
            else None
        ),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    Path(settings.local_upload_dir).mkdir(parents=True, exist_ok=True)
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)

    app.mount("/static/uploads", StaticFiles(directory=settings.local_upload_dir), name="uploads")

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(users_router, prefix=settings.api_v1_prefix)
    app.include_router(uploads_router, prefix=settings.api_v1_prefix)
    app.include_router(recipes_router, prefix=settings.api_v1_prefix)
    app.include_router(families_router, prefix=settings.api_v1_prefix)
    app.include_router(orders_router, prefix=settings.api_v1_prefix)
    app.include_router(notifications_router, prefix=settings.api_v1_prefix)
    app.include_router(feedback_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
