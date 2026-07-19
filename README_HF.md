---
title: Cook Picture
emoji: 🍳
colorFrom: green
colorTo: orange
sdk: gradio
pinned: false
---

# Cook Picture Backend

Cook Picture Backend is the FastAPI API and SQLite demo database for the Cook Picture mobile app.

## Runtime

This Hugging Face Space uses the free-compatible Gradio Space SDK while mounting the FastAPI backend API. The phone app remains the frontend and should point its API base URL to this Space's `/api/v1` endpoint.

The Docker image starts FastAPI with Uvicorn, stores demo data in SQLite under `/data/cook_picture.db`, and stores uploaded recipe images under `/data/uploads`.

For a public demo Space, set at least this secret in Hugging Face Space settings:

- `JWT_SECRET_KEY`: any long random secret value.

Optional environment variables:

- `DATABASE_URL`: defaults to `sqlite:////data/cook_picture.db`.
- `LOCAL_UPLOAD_DIR`: defaults to `/data/uploads`.
- `PUBLIC_BASE_URL`: set to the Space URL if uploaded image URLs need to be absolute.

Health check:

```text
/api/v1/health
```
