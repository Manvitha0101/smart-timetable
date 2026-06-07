"""
Google Calendar OAuth and sync endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import User, get_db
from services.user_context import get_active_user
from services import google_calendar as gcal

router = APIRouter(prefix="/api/google", tags=["google-calendar"])

FRONTEND_URL = __import__("os").getenv("FRONTEND_URL", "http://localhost:3000")


@router.get("/status")
async def google_status(user: User = Depends(get_active_user), db: AsyncSession = Depends(get_db)):
    return await gcal.get_google_status(db, user.id)


@router.get("/auth-url")
async def get_auth_url(user: User = Depends(get_active_user)):
    if not gcal.is_google_configured():
        raise HTTPException(400, "Google Calendar credentials not configured in .env")
    url = gcal.get_auth_url(state=user.id)
    return {"auth_url": url}


@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        await gcal.save_tokens_from_code(db, state, code)
        return RedirectResponse(f"{FRONTEND_URL}/settings?google=connected")
    except Exception as e:
        return RedirectResponse(f"{FRONTEND_URL}/settings?google=error&message={str(e)}")


@router.post("/sync")
async def sync_calendar(user: User = Depends(get_active_user), db: AsyncSession = Depends(get_db)):
    if not gcal.is_google_configured():
        raise HTTPException(400, "Google Calendar not configured")
    count = await gcal.sync_from_google(db, user)
    return {"imported": count, "message": f"Imported {count} events from Google Calendar"}


@router.post("/disconnect")
async def disconnect(user: User = Depends(get_active_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    from models.database import GoogleToken

    await db.execute(delete(GoogleToken).where(GoogleToken.user_id == user.id))
    await db.commit()
    return {"message": "Google Calendar disconnected"}
