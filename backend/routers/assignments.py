"""
Assignments CRUD Router
"""

import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from models.database import Assignment, Event, User, get_db
from models.schemas import AssignmentCreate, AssignmentUpdate, AssignmentResponse, EventResponse
from services.study_planner import plan_study_sessions
from services.user_context import get_active_user

router = APIRouter(prefix="/api/assignments", tags=["assignments"])

EVENT_TYPE_COLORS = {"study": "#43D9AD"}


@router.get("", response_model=List[AssignmentResponse])
async def get_assignments(
    status: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Assignment).where(Assignment.user_id == user.id).order_by(Assignment.due_date)
    if status:
        query = query.where(Assignment.status == status)
    if subject:
        query = query.where(Assignment.subject == subject)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=AssignmentResponse)
async def create_assignment(
    payload: AssignmentCreate,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    assignment = Assignment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        **payload.model_dump(),
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    payload: AssignmentUpdate,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id, Assignment.user_id == user.id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(assignment, field, value)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id, Assignment.user_id == user.id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    await db.execute(delete(Assignment).where(Assignment.id == assignment_id, Assignment.user_id == user.id))
    await db.commit()
    return {"message": "Assignment deleted"}


@router.post("/study-plan")
async def generate_study_plan(
    days_ahead: int = 7,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a Pomodoro study plan for all pending assignments."""
    res_assignments = await db.execute(
        select(Assignment)
        .where(Assignment.user_id == user.id)
        .where(Assignment.status != "completed")
        .order_by(Assignment.due_date)
    )
    assignments = [AssignmentResponse.model_validate(a) for a in res_assignments.scalars().all()]

    res_events = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time >= datetime.utcnow())
    )
    events = [EventResponse.model_validate(e) for e in res_events.scalars().all()]

    sessions = plan_study_sessions(assignments, events, days_ahead)
    return {"sessions": sessions, "total": len(sessions)}


@router.post("/study-plan/apply")
async def apply_study_plan(
    days_ahead: int = 7,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate study plan and create calendar events from sessions."""
    res_assignments = await db.execute(
        select(Assignment)
        .where(Assignment.user_id == user.id)
        .where(Assignment.status != "completed")
        .order_by(Assignment.due_date)
    )
    assignments = [AssignmentResponse.model_validate(a) for a in res_assignments.scalars().all()]

    res_events = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time >= datetime.utcnow())
    )
    events = [EventResponse.model_validate(e) for e in res_events.scalars().all()]

    sessions = plan_study_sessions(assignments, events, days_ahead)
    created = []

    for s in sessions:
        start = datetime.fromisoformat(s["start_time"])
        end = datetime.fromisoformat(s["end_time"])
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=s["title"],
            start_time=start,
            end_time=end,
            event_type="study",
            subject=s.get("subject"),
            color=s.get("color", EVENT_TYPE_COLORS["study"]),
        )
        db.add(event)
        created.append(event)

    if created:
        await db.commit()

    return {"created": len(created), "sessions": sessions}
