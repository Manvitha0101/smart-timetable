"""
Conflict Detection Service
- Sweep-line algorithm for overlap detection
- Classifies HARD (full overlap) and SOFT (≤10 min gap) conflicts
- Auto-generates 3 alternative time slot suggestions
"""

from datetime import datetime, timedelta
from typing import List, Tuple
from models.schemas import EventResponse, ConflictInfo


EVENT_COLORS = {
    "class": "#6C63FF",
    "exam": "#FF6584",
    "study": "#43D9AD",
    "assignment": "#FFB648",
    "personal": "#A78BFA",
}


def detect_conflicts(
    new_start: datetime,
    new_end: datetime,
    existing_events: List[EventResponse],
    exclude_id: str | None = None,
) -> ConflictInfo:
    """Detect if a new event [new_start, new_end] conflicts with existing events."""
    conflicts: List[EventResponse] = []

    for event in existing_events:
        if exclude_id and event.id == exclude_id:
            continue
        # Hard conflict: intervals overlap
        if new_start < event.end_time and new_end > event.start_time:
            conflicts.append(event)

    if not conflicts:
        # Check soft conflicts (back-to-back with < 10-min gap)
        soft_conflicts = []
        for event in existing_events:
            if exclude_id and event.id == exclude_id:
                continue
            gap_before = (new_start - event.end_time).total_seconds() / 60
            gap_after = (event.start_time - new_end).total_seconds() / 60
            if 0 < gap_before < 10 or 0 < gap_after < 10:
                soft_conflicts.append(event)
        if soft_conflicts:
            return ConflictInfo(
                has_conflict=True,
                conflicting_events=soft_conflicts,
                severity="soft",
                suggestions=_generate_suggestions(new_start, new_end, existing_events),
            )
        return ConflictInfo(has_conflict=False, severity="none")

    return ConflictInfo(
        has_conflict=True,
        conflicting_events=conflicts,
        severity="hard",
        suggestions=_generate_suggestions(new_start, new_end, existing_events),
    )


def _generate_suggestions(
    start: datetime,
    end: datetime,
    existing_events: List[EventResponse],
    max_suggestions: int = 3,
) -> List[dict]:
    """Generate up to 3 alternative non-conflicting time slots."""
    duration = end - start
    suggestions = []
    candidate = end + timedelta(minutes=15)

    # Try forward slots
    attempts = 0
    while len(suggestions) < max_suggestions and attempts < 48:
        candidate_end = candidate + duration
        # Only suggest during reasonable hours (7am - 10pm)
        if candidate.hour < 7:
            candidate = candidate.replace(hour=7, minute=0, second=0)
            candidate_end = candidate + duration
        if candidate.hour >= 22 or candidate_end.hour >= 22:
            # Jump to next day 8am
            candidate = (candidate + timedelta(days=1)).replace(hour=8, minute=0, second=0)
            candidate_end = candidate + duration

        overlap = any(
            candidate < ev.end_time and candidate_end > ev.start_time
            for ev in existing_events
        )
        if not overlap:
            suggestions.append({
                "start": candidate.isoformat(),
                "end": candidate_end.isoformat(),
                "label": f"{candidate.strftime('%a %b %d, %I:%M %p')} – {candidate_end.strftime('%I:%M %p')}",
            })
            candidate = candidate_end + timedelta(minutes=30)
        else:
            candidate += timedelta(minutes=30)
        attempts += 1

    return suggestions


def find_free_slots(
    date_from: datetime,
    date_to: datetime,
    duration_minutes: int,
    existing_events: List[EventResponse],
) -> List[Tuple[datetime, datetime]]:
    """Find all free slots of at least `duration_minutes` between date_from and date_to."""
    free_slots = []
    duration = timedelta(minutes=duration_minutes)

    # Sort events by start time
    sorted_events = sorted(existing_events, key=lambda e: e.start_time)

    # Working hours: 7am – 10pm
    current = date_from.replace(hour=7, minute=0, second=0, microsecond=0)
    if current < date_from:
        current = date_from

    for event in sorted_events:
        if event.start_time >= date_to:
            break
        if event.end_time <= current:
            continue
        # Gap before this event
        gap_end = min(event.start_time, date_to)
        if gap_end > current and (gap_end - current) >= duration:
            slot_start = current
            while slot_start + duration <= gap_end:
                free_slots.append((slot_start, slot_start + duration))
                slot_start += duration
        if event.end_time > current:
            current = event.end_time

    # Gap after last event
    day_end = date_to.replace(hour=22, minute=0, second=0, microsecond=0)
    if current < day_end and (day_end - current) >= duration:
        slot_start = current
        while slot_start + duration <= day_end:
            free_slots.append((slot_start, slot_start + duration))
            slot_start += duration

    return free_slots[:10]  # Return top 10 slots
