"""
Resolve the active user for API requests.
Unauthenticated requests use the shared demo user so the app works without login.
"""

from typing import Optional

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import User, get_db
from services.auth_service import get_current_user_optional
from services.db_migration import DEMO_USER_ID


async def get_active_user(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> User:
    if current_user:
        return current_user

    from sqlalchemy import select

    result = await db.execute(select(User).where(User.id == DEMO_USER_ID))
    user = result.scalar_one_or_none()
    if user:
        return user

    raise RuntimeError("Demo user not found — database migration may have failed.")
