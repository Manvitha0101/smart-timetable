"""
LangChain Tools for the Scheduling Agent
Each tool is a callable function that the AI agent can invoke.
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import List

from langchain.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import Event, Assignment
from models.schemas import EventResponse, AssignmentResponse
from services.conflict_detector import detect_conflicts, find_free_slots
from services.study_planner import plan_study_sessions, SUBJECT_COLORS


def get_tools(db: AsyncSession, user_id: str):
    """Return bound tools with access to the database session."""

    @tool
    async def list_upcoming_events(days: int = 7) -> str:
        """List upcoming events in the next N days (default 7). Use this to answer questions about the schedule."""
        now = datetime.utcnow()
        cutoff = now + timedelta(days=days)
        result = await db.execute(
            select(Event)
            .where(Event.user_id == user_id)
            .where(Event.start_time >= now)
            .where(Event.start_time <= cutoff)
            .order_by(Event.start_time)
        )
        events = result.scalars().all()
        if not events:
            return f"No events in the next {days} days."
        lines = []
        for e in events:
            start_str = e.start_time.strftime("%A %b %d, %I:%M %p")
            end_str = e.end_time.strftime("%I:%M %p")
            lines.append(f"• [{e.event_type.upper()}] {e.title} — {start_str} to {end_str}" + (f" @ {e.location}" if e.location else ""))
        return "\n".join(lines)

    @tool
    async def find_free_time(duration_minutes: int = 60, days_ahead: int = 3) -> str:
        """Find free time slots of at least duration_minutes in the next days_ahead days."""
        now = datetime.utcnow()
        end = now + timedelta(days=days_ahead)
        result = await db.execute(
            select(Event)
            .where(Event.user_id == user_id)
            .where(Event.start_time >= now)
            .where(Event.start_time <= end)
        )
        events = [EventResponse.model_validate(e) for e in result.scalars().all()]
        slots = find_free_slots(now, end, duration_minutes, events)
        if not slots:
            return f"No free slots of {duration_minutes} minutes found in the next {days_ahead} days."
        lines = []
        for s, e_slot in slots[:5]:
            lines.append(f"• {s.strftime('%A %b %d, %I:%M %p')} – {e_slot.strftime('%I:%M %p')}")
        return f"Available {duration_minutes}-min slots:\n" + "\n".join(lines)

    @tool
    async def create_event(
        title: str,
        start_iso: str,
        end_iso: str,
        event_type: str = "study",
        subject: str = "",
        location: str = "",
    ) -> str:
        """
        Create a calendar event. 
        start_iso and end_iso must be ISO 8601 datetime strings.
        event_type must be one of: class, exam, study, assignment, personal.
        """
        try:
            start = datetime.fromisoformat(start_iso)
            end = datetime.fromisoformat(end_iso)
        except ValueError:
            return f"Invalid datetime format. Use ISO 8601 (e.g. 2026-06-10T14:00:00)."

        # Check conflicts
        result = await db.execute(
            select(Event)
            .where(Event.user_id == user_id)
            .where(Event.start_time <= end)
            .where(Event.end_time >= start)
        )
        existing = [EventResponse.model_validate(e) for e in result.scalars().all()]
        conflict = detect_conflicts(start, end, existing)

        color = SUBJECT_COLORS.get(subject, {"class": "#6C63FF", "exam": "#FF6584", "study": "#43D9AD", "assignment": "#FFB648", "personal": "#A78BFA"}.get(event_type, "#6C63FF"))

        event = Event(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            start_time=start,
            end_time=end,
            event_type=event_type,
            subject=subject or None,
            location=location or None,
            color=color,
        )
        db.add(event)
        await db.commit()

        result_msg = f"✅ Created '{title}' on {start.strftime('%A %b %d, %I:%M %p')} – {end.strftime('%I:%M %p')}."
        if conflict.has_conflict:
            result_msg += f"\n⚠️ Warning: {conflict.severity} conflict with '{conflict.conflicting_events[0].title}'."
            if conflict.suggestions:
                result_msg += f"\n💡 Alternative: {conflict.suggestions[0]['label']}"
        return result_msg

    @tool
    async def check_conflicts_for_slot(start_iso: str, end_iso: str) -> str:
        """Check if a time slot has any scheduling conflicts with existing events."""
        try:
            start = datetime.fromisoformat(start_iso)
            end = datetime.fromisoformat(end_iso)
        except ValueError:
            return "Invalid datetime format."
        result = await db.execute(
            select(Event)
            .where(Event.user_id == user_id)
            .where(Event.start_time <= end)
            .where(Event.end_time >= start)
        )
        existing = [EventResponse.model_validate(e) for e in result.scalars().all()]
        conflict = detect_conflicts(start, end, existing)
        if not conflict.has_conflict:
            return f"✅ No conflicts! The slot {start.strftime('%A %b %d, %I:%M %p')} – {end.strftime('%I:%M %p')} is free."
        names = ", ".join(f"'{e.title}'" for e in conflict.conflicting_events)
        return f"⚠️ {conflict.severity.upper()} conflict with: {names}. Try: {conflict.suggestions[0]['label'] if conflict.suggestions else 'a different time'}."

    @tool
    async def list_pending_assignments() -> str:
        """List all pending and in-progress assignments sorted by due date."""
        result = await db.execute(
            select(Assignment)
            .where(Assignment.user_id == user_id)
            .where(Assignment.status != "completed")
            .order_by(Assignment.due_date)
        )
        assignments = result.scalars().all()
        if not assignments:
            return "No pending assignments. Great job! 🎉"
        lines = []
        for a in assignments:
            due_str = a.due_date.strftime("%a %b %d")
            days_left = (a.due_date - datetime.utcnow()).days
            urgency = "🔴" if days_left <= 2 else ("🟡" if days_left <= 5 else "🟢")
            lines.append(f"{urgency} [{a.priority.upper()}] {a.title} ({a.subject}) — Due {due_str} ({days_left}d left, ~{a.estimated_hours}h)")
        return "\n".join(lines)

    @tool
    async def suggest_study_plan(days_ahead: int = 7) -> str:
        """Generate a Pomodoro-based study plan for pending assignments in the next N days."""
        res_assignments = await db.execute(
            select(Assignment)
            .where(Assignment.user_id == user_id)
            .where(Assignment.status != "completed")
            .order_by(Assignment.due_date)
        )
        assignments = [AssignmentResponse.model_validate(a) for a in res_assignments.scalars().all()]

        res_events = await db.execute(
            select(Event).where(Event.user_id == user_id).where(Event.start_time >= datetime.utcnow())
        )
        events = [EventResponse.model_validate(e) for e in res_events.scalars().all()]

        sessions = plan_study_sessions(assignments, events, days_ahead)
        if not sessions:
            return "No study sessions could be planned. Your schedule may be very full, or there are no pending assignments."

        lines = [f"📚 Suggested study plan ({len(sessions)} Pomodoro sessions):"]
        for s in sessions[:10]:
            start_dt = datetime.fromisoformat(s["start_time"])
            end_dt = datetime.fromisoformat(s["end_time"])
            lines.append(f"• {s['title']} — {start_dt.strftime('%a %b %d, %I:%M %p')} to {end_dt.strftime('%I:%M %p')}")
        return "\n".join(lines)

    @tool
    async def get_schedule_summary() -> str:
        """Get a quick summary of today's schedule and upcoming exams."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0)
        today_end = now.replace(hour=23, minute=59, second=59)

        res = await db.execute(
            select(Event)
            .where(Event.user_id == user_id)
            .where(Event.start_time >= today_start)
            .where(Event.start_time <= today_end)
            .order_by(Event.start_time)
        )
        today_events = res.scalars().all()

        exam_res = await db.execute(
            select(Event)
            .where(Event.user_id == user_id)
            .where(Event.event_type == "exam")
            .where(Event.start_time >= now)
            .order_by(Event.start_time)
            .limit(3)
        )
        upcoming_exams = exam_res.scalars().all()

        lines = [f"📅 Today is {now.strftime('%A, %B %d')}"]
        if today_events:
            lines.append(f"\n🗓️ Today's schedule ({len(today_events)} events):")
            for e in today_events:
                lines.append(f"  • {e.start_time.strftime('%I:%M %p')} – {e.title}")
        else:
            lines.append("\n✨ No events scheduled today!")

        if upcoming_exams:
            lines.append("\n⚠️ Upcoming exams:")
            for ex in upcoming_exams:
                days = (ex.start_time - now).days
                lines.append(f"  • {ex.title} in {days} days ({ex.start_time.strftime('%b %d')})")

        return "\n".join(lines)

    return [
        list_upcoming_events,
        find_free_time,
        create_event,
        check_conflicts_for_slot,
        list_pending_assignments,
        suggest_study_plan,
        get_schedule_summary,
    ]
