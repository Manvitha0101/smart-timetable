from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean, DateTime, Float, Integer, ForeignKey
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./smart_timetable.db")

# Render PostgreSQL gives postgres:// — convert to asyncpg format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# SQLite needs check_same_thread=False; PostgreSQL doesn't
is_sqlite = "sqlite" in DATABASE_URL
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ─── User Model ───────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150))
    hashed_password: Mapped[str] = mapped_column(String(255))
    institution: Mapped[str | None] = mapped_column(String(200), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_color: Mapped[str] = mapped_column(String(20), default="#6C63FF")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    events: Mapped[list["Event"]] = relationship("Event", back_populates="owner", cascade="all, delete")
    assignments: Mapped[list["Assignment"]] = relationship("Assignment", back_populates="owner", cascade="all, delete")


# ─── Refresh Token Model ──────────────────────────────────────────────────────
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── Event Model ──────────────────────────────────────────────────────────────
class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime)
    end_time: Mapped[datetime] = mapped_column(DateTime)
    event_type: Mapped[str] = mapped_column(String(50), default="class")
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#6C63FF")
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule: Mapped[str | None] = mapped_column(String(200), nullable=True)
    google_event_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="events")
    reminders: Mapped[list["Reminder"]] = relationship("Reminder", back_populates="event", cascade="all, delete")


# ─── Assignment Model ─────────────────────────────────────────────────────────
class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    estimated_hours: Mapped[float] = mapped_column(Float, default=2.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="assignments")


# ─── Reminder Model ───────────────────────────────────────────────────────────
class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"))
    remind_at: Mapped[datetime] = mapped_column(DateTime)
    method: Mapped[str] = mapped_column(String(20), default="email")
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    event: Mapped["Event"] = relationship("Event", back_populates="reminders")


# ─── Google OAuth Token Model ─────────────────────────────────────────────────
class GoogleToken(Base):
    __tablename__ = "google_tokens"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    calendar_id: Mapped[str] = mapped_column(String(200), default="primary")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── User Preference Model ────────────────────────────────────────────────────
class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str] = mapped_column(Text)


# ─── DB helpers ───────────────────────────────────────────────────────────────
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
