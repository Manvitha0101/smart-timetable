"""
Google Calendar OAuth 2.0 integration.
Syncs events bidirectionally when credentials are configured.
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Event, GoogleToken, User

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/callback")


def is_google_configured() -> bool:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    return bool(
        client_id and client_secret
        and client_id != "your_google_client_id_here"
        and client_secret != "your_google_client_secret_here"
    )


def get_oauth_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )


def get_auth_url(state: str) -> str:
    flow = get_oauth_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    return auth_url


async def save_tokens_from_code(db: AsyncSession, user_id: str, code: str) -> bool:
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    result = await db.execute(select(GoogleToken).where(GoogleToken.user_id == user_id))
    token_row = result.scalar_one_or_none()

    if token_row:
        token_row.access_token = creds.token
        token_row.refresh_token = creds.refresh_token or token_row.refresh_token
        token_row.token_expiry = creds.expiry
        token_row.updated_at = datetime.utcnow()
    else:
        token_row = GoogleToken(
            user_id=user_id,
            access_token=creds.token,
            refresh_token=creds.refresh_token,
            token_expiry=creds.expiry,
        )
        db.add(token_row)

    await db.commit()
    return True


def _build_credentials(token_row: GoogleToken) -> Credentials:
    return Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES,
        expiry=token_row.token_expiry,
    )


async def get_google_status(db: AsyncSession, user_id: str) -> dict:
    result = await db.execute(select(GoogleToken).where(GoogleToken.user_id == user_id))
    token = result.scalar_one_or_none()
    return {
        "configured": is_google_configured(),
        "connected": token is not None,
        "calendar_id": token.calendar_id if token else "primary",
    }


async def push_event_to_google(db: AsyncSession, user_id: str, event: Event) -> Optional[str]:
    """Push a local event to Google Calendar. Returns google_event_id."""
    result = await db.execute(select(GoogleToken).where(GoogleToken.user_id == user_id))
    token_row = result.scalar_one_or_none()
    if not token_row or not is_google_configured():
        return None

    creds = _build_credentials(token_row)
    service = build("calendar", "v3", credentials=creds)

    body = {
        "summary": event.title,
        "description": event.description or "",
        "location": event.location or "",
        "start": {"dateTime": event.start_time.isoformat() + "Z", "timeZone": "UTC"},
        "end": {"dateTime": event.end_time.isoformat() + "Z", "timeZone": "UTC"},
    }

    if event.google_event_id:
        updated = service.events().update(
            calendarId=token_row.calendar_id,
            eventId=event.google_event_id,
            body=body,
        ).execute()
        return updated["id"]

    created = service.events().insert(calendarId=token_row.calendar_id, body=body).execute()
    return created["id"]


async def sync_from_google(db: AsyncSession, user: User) -> int:
    """Import upcoming Google Calendar events for the user. Returns count imported."""
    result = await db.execute(select(GoogleToken).where(GoogleToken.user_id == user.id))
    token_row = result.scalar_one_or_none()
    if not token_row or not is_google_configured():
        return 0

    creds = _build_credentials(token_row)
    service = build("calendar", "v3", credentials=creds)

    now = datetime.utcnow()
    events_result = service.events().list(
        calendarId=token_row.calendar_id,
        timeMin=now.isoformat() + "Z",
        timeMax=(now + timedelta(days=30)).isoformat() + "Z",
        singleEvents=True,
        orderBy="startTime",
        maxResults=50,
    ).execute()

    imported = 0
    for g_event in events_result.get("items", []):
        g_id = g_event["id"]
        existing = await db.execute(
            select(Event).where(Event.google_event_id == g_id, Event.user_id == user.id)
        )
        if existing.scalar_one_or_none():
            continue

        start = g_event["start"].get("dateTime") or g_event["start"].get("date")
        end = g_event["end"].get("dateTime") or g_event["end"].get("date")
        if not start or not end:
            continue

        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00")).replace(tzinfo=None)
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00")).replace(tzinfo=None)

        event = Event(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=g_event.get("summary", "Google Event"),
            description=g_event.get("description"),
            start_time=start_dt,
            end_time=end_dt,
            event_type="personal",
            location=g_event.get("location"),
            color="#A78BFA",
            google_event_id=g_id,
        )
        db.add(event)
        imported += 1

    if imported:
        await db.commit()
    return imported


async def disconnect_google(db: AsyncSession, user_id: str):
    from sqlalchemy import delete
    await db.execute(delete(GoogleToken).where(GoogleToken.user_id == user_id))
    await db.commit()
