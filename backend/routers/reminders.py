"""
Reminder API — schedule email alerts before events.
"""

import uuid
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from models.database import Reminder, Event, User, get_db
from models.schemas import ReminderCreate, ReminderResponse
from services.user_context import get_active_user
from services.email_service import is_email_configured

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

DEFAULT_OFFSETS = [
    ("1 day before", timedelta(days=1)),
    ("2 hours before", timedelta(hours=2)),
    ("30 minutes before", timedelta(minutes=30)),
]


@router.get("/status")
async def reminder_status():
    return {"email_configured": is_email_configured()}


@router.get("", response_model=List[ReminderResponse])
async def list_reminders(
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reminder)
        .join(Event, Reminder.event_id == Event.id)
        .where(Event.user_id == user.id)
        .order_by(Reminder.remind_at)
    )
    return result.scalars().all()


@router.post("", response_model=ReminderResponse, status_code=201)
async def create_reminder(
    payload: ReminderCreate,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(
        select(Event).where(Event.id == payload.event_id, Event.user_id == user.id)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(404, "Event not found")

    reminder = Reminder(
        id=str(uuid.uuid4()),
        event_id=payload.event_id,
        remind_at=payload.remind_at,
        method=payload.method,
        email=payload.email or user.email,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.post("/auto/{event_id}", response_model=List[ReminderResponse])
async def auto_schedule_reminders(
    event_id: str,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedule default reminders (1 day, 2 hours, 30 min before) for an event."""
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")

    created = []
    for label, offset in DEFAULT_OFFSETS:
        remind_at = event.start_time - offset
        if remind_at <= datetime.utcnow():
            continue
        reminder = Reminder(
            id=str(uuid.uuid4()),
            event_id=event_id,
            remind_at=remind_at,
            method="email",
            email=user.email,
        )
        db.add(reminder)
        created.append(reminder)

    await db.commit()
    for r in created:
        await db.refresh(r)
    return created


@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reminder)
        .join(Event, Reminder.event_id == Event.id)
        .where(Reminder.id == reminder_id, Event.user_id == user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    await db.execute(delete(Reminder).where(Reminder.id == reminder_id))
    await db.commit()
    return {"message": "Reminder deleted"}
