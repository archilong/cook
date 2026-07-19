from pathlib import Path
import os
import sys

import gradio as gr
import uvicorn

project_root = Path(__file__).resolve().parent
backend_dir = project_root / "backend"
data_dir = project_root / "data"
upload_dir = data_dir / "uploads"

sys.path.insert(0, str(backend_dir))

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{(data_dir / 'cook_picture.db').as_posix()}")
os.environ.setdefault("LOCAL_UPLOAD_DIR", upload_dir.as_posix())
os.environ.setdefault("AUTO_CREATE_TABLES", "true")

from app.main import app as fastapi_app  # noqa: E402


with gr.Blocks(title="Cook Picture Backend") as demo:
    gr.Markdown(
        """
        # Cook Picture Backend

        This Space runs the backend API for the Cook Picture phone app.

        - API health check: `/api/v1/health`
        - Phone app API base URL: this Space URL plus `/api/v1`
        """
    )

app = gr.mount_gradio_app(fastapi_app, demo, path="/")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "7860")))
