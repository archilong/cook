from pydantic import BaseModel, EmailStr, Field, field_validator


class FeedbackCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    contact_email: EmailStr | None = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Feedback content is required")
        return value


class FeedbackSubmitResult(BaseModel):
    message: str = "feedback_sent"
