"""
Database migration helper — works for both SQLite and PostgreSQL.
Creates tables and seeds the demo user on startup.
"""

import uuid
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from models.database import Base, User
from services.auth_service import hash_password

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
DEMO_USER_EMAIL = "demo@smarttimetable.local"


async def _table_exists(conn, table: str) -> bool:
    """Works for both SQLite and PostgreSQL."""
    try:
        # PostgreSQL
        result = await conn.execute(
            text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :t)"),
            {"t": table},
        )
        return result.scalar()
    except Exception:
        # SQLite fallback
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"),
            {"t": table},
        )
        return result.fetchone() is not None


async def _column_exists(conn, table: str, column: str) -> bool:
    """Works for both SQLite and PostgreSQL."""
    try:
        # PostgreSQL
        result = await conn.execute(
            text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = :t AND column_name = :c
                )
            """),
            {"t": table, "c": column},
        )
        return result.scalar()
    except Exception:
        # SQLite fallback
        result = await conn.execute(text(f"PRAGMA table_info({table})"))
        return any(row[1] == column for row in result.fetchall())


async def run_migrations(engine: AsyncEngine) -> str:
    """Apply schema migrations and ensure demo user exists. Returns demo user id."""
    async with engine.begin() as conn:
        # Create all tables (safe — skips existing tables)
        await conn.run_sync(Base.metadata.create_all)

        # Add user_id columns to old tables if missing
        for table in ("events", "assignments", "user_preferences"):
            if await _table_exists(conn, table) and not await _column_exists(conn, table, "user_id"):
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id VARCHAR(36)"))

    # Ensure demo user exists
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT id FROM users WHERE id = :id"),
            {"id": DEMO_USER_ID},
        )
        if not result.fetchone():
            await conn.execute(
                text(
                    """INSERT INTO users (id, email, name, hashed_password, institution, semester,
                       avatar_color, is_active, is_demo, created_at, last_login)
                       VALUES (:id, :email, :name, :pw, :inst, :sem, :color, TRUE, TRUE, :now, NULL)"""
                ),
                {
                    "id": DEMO_USER_ID,
                    "email": DEMO_USER_EMAIL,
                    "name": "Demo Student",
                    "pw": hash_password("DemoPass1"),
                    "inst": "Smart Timetable University",
                    "sem": "Semester 4",
                    "color": "#6C63FF",
                    "now": datetime.utcnow(),
                },
            )

        # Assign orphan events/assignments to demo user
        for table in ("events", "assignments"):
            if await _table_exists(conn, table) and await _column_exists(conn, table, "user_id"):
                await conn.execute(
                    text(f"UPDATE {table} SET user_id = :uid WHERE user_id IS NULL"),
                    {"uid": DEMO_USER_ID},
                )

    return DEMO_USER_ID
