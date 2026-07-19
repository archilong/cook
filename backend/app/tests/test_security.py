from datetime import UTC, datetime

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_hash_password_does_not_store_plain_text() -> None:
    hashed = hash_password("secret-password")

    assert hashed != "secret-password"
    assert verify_password("secret-password", hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_create_and_decode_access_token() -> None:
    token = create_access_token(subject="123")

    payload = decode_access_token(token)

    assert payload["sub"] == "123"
    assert datetime.fromtimestamp(payload["exp"], tz=UTC) > datetime.now(tz=UTC)
