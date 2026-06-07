"""
Calendar CRUD API Router
"""

import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from models.database import Event, User, get_db
from models.schemas import (
    EventCreate, EventUpdate, EventResponse,
    EventCreateResponse, ConflictInfo, FreeSlotRequest, FreeSlot
)
from services.conflict_detector import detect_conflicts, find_free_slots
from services.user_context import get_active_user
from services import google_calendar as gcal

router = APIRouter(prefix="/api/events", tags=["events"])

EVENT_TYPE_COLORS = {
    "class": "#6C63FF",
    "exam": "#FF6584",
    "study": "#43D9AD",
    "assignment": "#FFB648",
    "personal": "#A78BFA",
}


@router.get("", response_model=List[EventResponse])
async def get_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Event).where(Event.user_id == user.id)
    if start:
        query = query.where(Event.end_time >= start)
    if end:
        query = query.where(Event.start_time <= end)
    if event_type:
        query = query.where(Event.event_type == event_type)
    if subject:
        query = query.where(Event.subject == subject)
    query = query.order_by(Event.start_time)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=EventCreateResponse)
async def create_event(
    payload: EventCreate,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "end_time must be after start_time")

    result = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time < payload.end_time)
        .where(Event.end_time > payload.start_time)
    )
    existing = [EventResponse.model_validate(e) for e in result.scalars().all()]
    conflict = detect_conflicts(payload.start_time, payload.end_time, existing)

    color = payload.color or EVENT_TYPE_COLORS.get(payload.event_type, "#6C63FF")

    event = Event(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        start_time=payload.start_time,
        end_time=payload.end_time,
        event_type=payload.event_type,
        subject=payload.subject,
        location=payload.location,
        color=color,
        is_recurring=payload.is_recurring,
        recurrence_rule=payload.recurrence_rule,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    try:
        g_id = await gcal.push_event_to_google(db, user.id, event)
        if g_id:
            event.google_event_id = g_id
            await db.commit()
            await db.refresh(event)
    except Exception:
        pass

    return EventCreateResponse(
        event=EventResponse.model_validate(event),
        conflict=conflict,
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    return event


@router.put("/{event_id}", response_model=EventCreateResponse)
async def update_event(
    event_id: str,
    payload: EventUpdate,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)

    conflict_result = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time < event.end_time)
        .where(Event.end_time > event.start_time)
        .where(Event.id != event_id)
    )
    existing = [EventResponse.model_validate(e) for e in conflict_result.scalars().all()]
    conflict = detect_conflicts(event.start_time, event.end_time, existing, exclude_id=event_id)

    try:
        await gcal.push_event_to_google(db, user.id, event)
    except Exception:
        pass

    return EventCreateResponse(event=EventResponse.model_validate(event), conflict=conflict)


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    await db.execute(delete(Event).where(Event.id == event_id, Event.user_id == user.id))
    await db.commit()
    return {"message": "Event deleted"}


@router.post("/free-slots", response_model=List[FreeSlot])
async def get_free_slots(
    payload: FreeSlotRequest,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time < payload.date_to)
        .where(Event.end_time > payload.date_from)
    )
    existing = [EventResponse.model_validate(e) for e in result.scalars().all()]
    slots = find_free_slots(payload.date_from, payload.date_to, payload.duration_minutes, existing)
    return [FreeSlot(start=s, end=e, duration_minutes=payload.duration_minutes) for s, e in slots]


@router.post("/check-conflicts", response_model=ConflictInfo)
async def check_conflicts(
    payload: EventCreate,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time < payload.end_time)
        .where(Event.end_time > payload.start_time)
    )
    existing = [EventResponse.model_validate(e) for e in result.scalars().all()]
    return detect_conflicts(payload.start_time, payload.end_time, existing)
