from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, User, UserSettings


def test_user_and_settings_tables_can_be_created_in_sqlite() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    table_names = set(Base.metadata.tables.keys())

    assert "users" in table_names
    assert "user_settings" in table_names


def test_user_settings_defaults_can_be_persisted() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        user = User(email="cook@example.com", password_hash="hashed", nickname="Cook")
        session.add(user)
        session.flush()

        settings = UserSettings(user_id=user.id)
        session.add(settings)
        session.commit()

        saved = session.query(UserSettings).filter_by(user_id=user.id).one()

    assert saved.theme_mode == "light"
    assert saved.primary_color == "#F97316"
    assert saved.default_reminder_minutes == 30
    assert saved.notifications_enabled is True
