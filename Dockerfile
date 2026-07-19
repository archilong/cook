FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=development \
    DATABASE_URL=sqlite:////data/cook_picture.db \
    LOCAL_UPLOAD_DIR=/data/uploads \
    AUTO_CREATE_TABLES=true

WORKDIR /app
COPY backend ./backend
RUN pip install --no-cache-dir ./backend
COPY start.sh ./start.sh
RUN chmod +x ./start.sh && mkdir -p /data/uploads

EXPOSE 7860
CMD ["./start.sh"]
