"""
Analytics Router - Time management insights and productivity metrics
"""

from datetime import datetime, timedelta, date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import Event, Assignment, User, get_db
from models.schemas import EventResponse, AssignmentResponse, WeeklyStats
from services.study_planner import analyze_workload
from services.user_context import get_active_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/weekly", response_model=WeeklyStats)
async def get_weekly_stats(
    week_start: Optional[date] = Query(None),
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not week_start:
        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())

    res_events = await db.execute(select(Event).where(Event.user_id == user.id))
    events = [EventResponse.model_validate(e) for e in res_events.scalars().all()]

    res_assignments = await db.execute(select(Assignment).where(Assignment.user_id == user.id))
    assignments = [AssignmentResponse.model_validate(a) for a in res_assignments.scalars().all()]

    stats = analyze_workload(events, assignments, week_start)
    return WeeklyStats(**stats)


@router.get("/subject-hours")
async def get_subject_hours(
    days: int = Query(30, description="Number of past days to analyze"),
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time >= since)
        .where(Event.subject.isnot(None))
    )
    events = result.scalars().all()

    subject_hours: dict = {}
    for e in events:
        h = (e.end_time - e.start_time).total_seconds() / 3600
        subject_hours[e.subject] = round(subject_hours.get(e.subject, 0) + h, 2)

    COLORS = {
        "Data Structures": "#6C63FF", "Mathematics": "#FF6584",
        "Physics": "#43D9AD", "OS": "#FFB648",
        "Networks": "#A78BFA", "DBMS": "#38BDF8",
        "SE": "#FB923C", "AI/ML": "#34D399",
    }
    return [
        {"subject": s, "hours": h, "color": COLORS.get(s, "#6C63FF")}
        for s, h in sorted(subject_hours.items(), key=lambda x: -x[1])
    ]


@router.get("/daily-hours")
async def get_daily_hours(
    days: int = Query(14),
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Event).where(Event.user_id == user.id).where(Event.start_time >= since)
    )
    events = result.scalars().all()

    daily: dict = {}
    for e in events:
        day = e.start_time.strftime("%a %b %d")
        h = (e.end_time - e.start_time).total_seconds() / 3600
        if day not in daily:
            daily[day] = {"date": day, "class": 0, "study": 0, "exam": 0, "other": 0}
        t = e.event_type if e.event_type in ("class", "study", "exam") else "other"
        daily[day][t] = round(daily[day][t] + h, 2)

    return list(daily.values())


@router.get("/upcoming-deadlines")
async def get_upcoming_deadlines(
    days: int = Query(14),
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.utcnow() + timedelta(days=days)
    result = await db.execute(
        select(Assignment)
        .where(Assignment.user_id == user.id)
        .where(Assignment.due_date <= cutoff)
        .where(Assignment.status != "completed")
        .order_by(Assignment.due_date)
    )
    assignments = result.scalars().all()
    now = datetime.utcnow()
    return [
        {
            "id": a.id,
            "title": a.title,
            "subject": a.subject,
            "due_date": a.due_date.isoformat(),
            "priority": a.priority,
            "days_left": max(0, (a.due_date - now).days),
            "estimated_hours": a.estimated_hours,
        }
        for a in assignments
    ]


@router.get("/overview")
async def get_overview(user: User = Depends(get_active_user), db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0)
    today_end = now.replace(hour=23, minute=59, second=59)
    week_end = now + timedelta(days=7)

    # Today's events
    res_today = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.start_time >= today_start)
        .where(Event.start_time <= today_end)
    )
    today_count = len(res_today.scalars().all())

    # Upcoming exams (next 14 days)
    res_exams = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.event_type == "exam")
        .where(Event.start_time >= now)
        .where(Event.start_time <= now + timedelta(days=14))
    )
    exam_count = len(res_exams.scalars().all())

    # Pending assignments
    res_assignments = await db.execute(
        select(Assignment).where(Assignment.user_id == user.id).where(Assignment.status != "completed")
    )
    pending_count = len(res_assignments.scalars().all())

    # Study hours this week
    res_study = await db.execute(
        select(Event)
        .where(Event.user_id == user.id)
        .where(Event.event_type == "study")
        .where(Event.start_time >= today_start - timedelta(days=today_start.weekday()))
        .where(Event.start_time <= week_end)
    )
    study_events = res_study.scalars().all()
    study_hours = sum((e.end_time - e.start_time).total_seconds() / 3600 for e in study_events)

    return {
        "today_events": today_count,
        "upcoming_exams": exam_count,
        "pending_assignments": pending_count,
        "study_hours_this_week": round(study_hours, 1),
    }
