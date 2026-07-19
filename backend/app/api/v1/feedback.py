from fastapi import APIRouter, HTTPException, status

from app.schemas.feedback import FeedbackCreate, FeedbackSubmitResult
from app.services.feedback_service import (
    FeedbackConfigurationError,
    FeedbackDeliveryError,
    send_feedback_email,
)

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackSubmitResult, status_code=status.HTTP_202_ACCEPTED)
def submit_feedback(request: FeedbackCreate) -> FeedbackSubmitResult:
    try:
        send_feedback_email(request.content.strip(), request.contact_email)
    except FeedbackConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Feedback email is not configured.",
        ) from exc
    except FeedbackDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Feedback email could not be sent.",
        ) from exc
    return FeedbackSubmitResult()
