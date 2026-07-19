import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.feedback_service import FeedbackConfigurationError, FeedbackDeliveryError


def test_submit_feedback_sends_email(monkeypatch: pytest.MonkeyPatch) -> None:
    sent: dict[str, str | None] = {}

    def fake_send_feedback_email(content: str, contact_email: str | None = None) -> None:
        sent["content"] = content
        sent["contact_email"] = contact_email

    monkeypatch.setattr("app.api.v1.feedback.send_feedback_email", fake_send_feedback_email)

    response = TestClient(app).post(
        "/api/v1/feedback",
        json={"content": "希望增加菜谱导出功能", "contact_email": "user@example.com"},
    )

    assert response.status_code == 202
    assert response.json() == {"message": "feedback_sent"}
    assert sent == {"content": "希望增加菜谱导出功能", "contact_email": "user@example.com"}


def test_submit_feedback_rejects_empty_content() -> None:
    response = TestClient(app).post("/api/v1/feedback", json={"content": "   "})

    assert response.status_code == 422


def test_submit_feedback_maps_missing_email_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_send_feedback_email(content: str, contact_email: str | None = None) -> None:
        raise FeedbackConfigurationError("SMTP_PASSWORD is missing")

    monkeypatch.setattr("app.api.v1.feedback.send_feedback_email", fake_send_feedback_email)

    response = TestClient(app).post("/api/v1/feedback", json={"content": "测试反馈"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Feedback email is not configured."


def test_submit_feedback_maps_delivery_failure_without_leaking_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_send_feedback_email(content: str, contact_email: str | None = None) -> None:
        raise FeedbackDeliveryError("password=secret-auth-code failed")

    monkeypatch.setattr("app.api.v1.feedback.send_feedback_email", fake_send_feedback_email)

    response = TestClient(app).post("/api/v1/feedback", json={"content": "测试反馈"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Feedback email could not be sent."
    assert "secret-auth-code" not in response.text
