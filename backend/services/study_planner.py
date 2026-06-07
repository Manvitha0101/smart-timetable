"""
Study Planner Service
- Pomodoro-aware session scheduling
- Priority-weighted time allocation by subject
- Workload balancing across the week
"""

from datetime import datetime, timedelta, date
from typing import List, Dict
from models.schemas import EventResponse, AssignmentResponse


SUBJECT_COLORS = {
    "Data Structures": "#6C63FF",
    "Mathematics": "#FF6584",
    "Physics": "#43D9AD",
    "OS": "#FFB648",
    "Networks": "#A78BFA",
    "DBMS": "#38BDF8",
    "SE": "#FB923C",
    "AI/ML": "#34D399",
}

PRIORITY_WEIGHT = {"high": 3, "medium": 2, "low": 1}

POMODORO_BLOCK = 25  # minutes work
POMODORO_BREAK = 5   # minutes break
LONG_BREAK = 15      # after 4 pomodoros


def plan_study_sessions(
    assignments: List[AssignmentResponse],
    existing_events: List[EventResponse],
    days_ahead: int = 7,
) -> List[dict]:
    """
    Generate a Pomodoro-aware study plan for the next `days_ahead` days.
    Returns a list of suggested study session dicts.
    """
    now = datetime.utcnow()
    sessions = []

    # Sort assignments by priority then due date
    sorted_assignments = sorted(
        [a for a in assignments if a.status != "completed"],
        key=lambda a: (
            -PRIORITY_WEIGHT.get(a.priority, 1),
            a.due_date,
        ),
    )

    # Find free slots day by day (8am – 9pm)
    for day_offset in range(days_ahead):
        day = now.date() + timedelta(days=day_offset)
        day_start = datetime.combine(day, datetime.min.time()).replace(hour=8)
        day_end = day_start.replace(hour=21)

        # Get events for this day
        day_events = [
            e for e in existing_events
            if e.start_time.date() == day
        ]
        day_events.sort(key=lambda e: e.start_time)

        # Find gaps
        free_gaps = _get_free_gaps(day_start, day_end, day_events)

        # Assign subjects to gaps
        for gap_start, gap_end in free_gaps:
            if not sorted_assignments:
                break

            gap_minutes = (gap_end - gap_start).total_seconds() / 60
            if gap_minutes < 30:
                continue

            # Pick next assignment
            assignment = sorted_assignments[0]
            subject = assignment.subject
            color = SUBJECT_COLORS.get(subject, "#6C63FF")

            # Create Pomodoro blocks within the gap
            session_start = gap_start
            pomodoros_done = 0

            while (gap_end - session_start).total_seconds() / 60 >= POMODORO_BLOCK:
                work_end = session_start + timedelta(minutes=POMODORO_BLOCK)
                if work_end > gap_end:
                    break

                sessions.append({
                    "id": None,
                    "title": f"Study: {subject}",
                    "description": f"Pomodoro #{pomodoros_done + 1} for '{assignment.title}'",
                    "start_time": session_start.isoformat(),
                    "end_time": work_end.isoformat(),
                    "event_type": "study",
                    "subject": subject,
                    "color": color,
                    "assignment_id": assignment.id,
                })

                pomodoros_done += 1
                break_len = LONG_BREAK if pomodoros_done % 4 == 0 else POMODORO_BREAK
                session_start = work_end + timedelta(minutes=break_len)

            # Remove assignment from queue if enough sessions planned
            if pomodoros_done > 0:
                sorted_assignments.pop(0)

    return sessions


def analyze_workload(
    events: List[EventResponse],
    assignments: List[AssignmentResponse],
    week_start: date,
) -> Dict:
    """Compute weekly workload metrics."""
    week_end = week_start + timedelta(days=7)

    week_events = [
        e for e in events
        if week_start <= e.start_time.date() < week_end
    ]

    total_hours = sum(
        (e.end_time - e.start_time).total_seconds() / 3600
        for e in week_events
    )
    study_hours = sum(
        (e.end_time - e.start_time).total_seconds() / 3600
        for e in week_events if e.event_type == "study"
    )
    class_hours = sum(
        (e.end_time - e.start_time).total_seconds() / 3600
        for e in week_events if e.event_type == "class"
    )

    # Pressure from upcoming deadlines
    pending = [
        a for a in assignments
        if a.status != "completed"
        and week_start <= a.due_date.date() < week_end + timedelta(days=7)
    ]

    # Subject breakdown
    subject_hours: Dict[str, float] = {}
    for e in week_events:
        if e.subject:
            subject_hours[e.subject] = subject_hours.get(e.subject, 0) + (
                e.end_time - e.start_time
            ).total_seconds() / 3600

    # Busiest day
    day_hours: Dict[str, float] = {}
    for e in week_events:
        day = e.start_time.strftime("%A")
        day_hours[day] = day_hours.get(day, 0) + (
            e.end_time - e.start_time
        ).total_seconds() / 3600
    busiest = max(day_hours, key=day_hours.get) if day_hours else "None"

    # Productivity score (0-100)
    scheduled_ratio = min(total_hours / 40, 1)  # 40h work week
    deadline_penalty = min(len(pending) * 5, 30)
    score = max(0, int(scheduled_ratio * 100) - deadline_penalty)

    return {
        "total_scheduled_hours": round(total_hours, 1),
        "study_hours": round(study_hours, 1),
        "class_hours": round(class_hours, 1),
        "free_hours": max(0, round(40 - total_hours, 1)),
        "productivity_score": score,
        "subject_breakdown": [
            {"subject": s, "hours": round(h, 1), "color": SUBJECT_COLORS.get(s, "#6C63FF")}
            for s, h in sorted(subject_hours.items(), key=lambda x: -x[1])
        ],
        "busiest_day": busiest,
        "upcoming_deadlines": len(pending),
    }


def _get_free_gaps(
    day_start: datetime,
    day_end: datetime,
    events: List[EventResponse],
) -> List[tuple]:
    gaps = []
    current = day_start
    for event in sorted(events, key=lambda e: e.start_time):
        if event.start_time > current:
            gaps.append((current, min(event.start_time, day_end)))
        current = max(current, event.end_time)
    if current < day_end:
        gaps.append((current, day_end))
    return gaps
