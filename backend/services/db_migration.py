"""
Database migration helper for SQLite schema upgrades.
Adds auth tables and user_id columns to existing databases.
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
    result = await conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"),
        {"t": table},
    )
    return result.fetchone() is not None


async def _column_exists(conn, table: str, column: str) -> bool:
    result = await conn.execute(text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result.fetchall())


async def run_migrations(engine: AsyncEngine) -> str:
    """Apply schema migrations and ensure demo user exists. Returns demo user id."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        if not await _table_exists(conn, "users"):
            pass  # create_all handles new tables

        if await _table_exists(conn, "events") and not await _column_exists(conn, "events", "user_id"):
            await conn.execute(text("ALTER TABLE events ADD COLUMN user_id VARCHAR(36)"))

        if await _table_exists(conn, "assignments") and not await _column_exists(conn, "assignments", "user_id"):
            await conn.execute(text("ALTER TABLE assignments ADD COLUMN user_id VARCHAR(36)"))

        if await _table_exists(conn, "user_preferences") and not await _column_exists(conn, "user_preferences", "user_id"):
            await conn.execute(text("ALTER TABLE user_preferences ADD COLUMN user_id VARCHAR(36)"))

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
                       VALUES (:id, :email, :name, :pw, :inst, :sem, :color, 1, 1, :now, NULL)"""
                ),
                {
                    "id": DEMO_USER_ID,
                    "email": DEMO_USER_EMAIL,
                    "name": "Demo Student",
                    "pw": hash_password("DemoPass1"),
                    "inst": "Smart Timetable University",
                    "sem": "Semester 4",
                    "color": "#6C63FF",
                    "now": datetime.utcnow().isoformat(),
                },
            )

        for table in ("events", "assignments"):
            if await _table_exists(conn, table) and await _column_exists(conn, table, "user_id"):
                await conn.execute(
                    text(f"UPDATE {table} SET user_id = :uid WHERE user_id IS NULL"),
                    {"uid": DEMO_USER_ID},
                )

    return DEMO_USER_ID
