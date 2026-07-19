from datetime import datetime, timezone
from email.message import EmailMessage
import smtplib

from app.core.config import settings


class FeedbackConfigurationError(RuntimeError):
    pass


class FeedbackDeliveryError(RuntimeError):
    pass


def _required_setting(value: str | None, name: str) -> str:
    if not value:
        raise FeedbackConfigurationError(f"{name} is missing")
    return value


def send_feedback_email(content: str, contact_email: str | None = None) -> None:
    trimmed_content = content.strip()
    if not trimmed_content:
        raise ValueError("Feedback content is required")

    smtp_host = _required_setting(settings.smtp_host, "SMTP_HOST")
    smtp_username = _required_setting(settings.smtp_username, "SMTP_USERNAME")
    smtp_password = _required_setting(settings.smtp_password, "SMTP_PASSWORD")
    from_email = settings.smtp_from_email or smtp_username

    message = EmailMessage()
    message["Subject"] = "Cook Picture 反馈"
    message["From"] = from_email
    message["To"] = settings.feedback_recipient_email
    body = [
        "收到一条 Cook Picture 反馈。",
        "",
        f"提交时间：{datetime.now(timezone.utc).isoformat()}",
        f"联系邮箱：{contact_email or '未提供'}",
        "",
        "反馈内容：",
        trimmed_content,
    ]
    message.set_content("\n".join(body))

    try:
        with smtplib.SMTP(smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise FeedbackDeliveryError("Could not send feedback email") from exc
