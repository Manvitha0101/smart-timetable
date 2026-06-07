"""
Demo Data Service - Generates realistic demo events for testing
without needing Google Calendar API keys.
"""

from datetime import datetime, timedelta
import uuid
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist():
    return datetime.now(IST).replace(tzinfo=None)


def make_event(title, event_type, subject, start_offset_days, hour, minute, duration_hours, color, location=None, description=None):
    base = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
    start = base + timedelta(days=start_offset_days, hours=hour, minutes=minute)
    end = start + timedelta(hours=duration_hours)
    return {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description or f"{event_type.capitalize()} session",
        "start_time": start,
        "end_time": end,
        "event_type": event_type,
        "subject": subject,
        "location": location or "Room 101",
        "color": color,
        "is_recurring": False,
        "recurrence_rule": None,
        "google_event_id": None,
        "created_at": now_ist() - timedelta(days=7),
    }


DEMO_EVENTS_RAW = [
    # ── This week's classes ───────────────────────────────────────────────────
    make_event("Data Structures Lecture", "class", "Data Structures", 0, 9, 0, 1.5, "#6C63FF", "CS Block A-101"),
    make_event("Mathematics Tutorial", "class", "Mathematics", 0, 11, 0, 1, "#6C63FF", "Math Block B-203"),
    make_event("Physics Lab", "class", "Physics", 1, 10, 0, 2, "#6C63FF", "Physics Lab L-01"),
    make_event("Operating Systems", "class", "OS", 1, 14, 0, 1.5, "#6C63FF", "CS Block A-102"),
    make_event("Computer Networks", "class", "Networks", 2, 9, 0, 1.5, "#6C63FF", "CS Block A-104"),
    make_event("DBMS Lecture", "class", "DBMS", 2, 11, 30, 1.5, "#6C63FF", "CS Block A-103"),
    make_event("Software Engineering", "class", "SE", 3, 9, 0, 1.5, "#6C63FF", "CS Block B-201"),
    make_event("AI/ML Lecture", "class", "AI/ML", 4, 10, 0, 1.5, "#6C63FF", "CS Block A-105"),
    make_event("Data Structures Lab", "class", "Data Structures", 4, 14, 0, 2, "#6C63FF", "CS Lab L-02"),

    # ── Exams ─────────────────────────────────────────────────────────────────
    make_event("Mid-Term: Data Structures", "exam", "Data Structures", 7, 9, 0, 3, "#FF6584", "Exam Hall E-1", "Chapters 1-6: Arrays, Linked Lists, Trees, Graphs"),
    make_event("Mid-Term: Mathematics", "exam", "Mathematics", 8, 14, 0, 3, "#FF6584", "Exam Hall E-2", "Calculus, Linear Algebra, Probability"),
    make_event("Quiz: Operating Systems", "exam", "OS", 3, 16, 0, 1, "#FF6584", "CS Block A-102"),
    make_event("Practical Exam: Physics", "exam", "Physics", 14, 10, 0, 2, "#FF6584", "Physics Lab L-01"),

    # ── Study Sessions ────────────────────────────────────────────────────────
    make_event("Study: DS Revision", "study", "Data Structures", 5, 15, 0, 2, "#43D9AD"),
    make_event("Study: Math Practice", "study", "Mathematics", 6, 10, 0, 2, "#43D9AD"),
    make_event("Study: OS Concepts", "study", "OS", 2, 16, 30, 1.5, "#43D9AD"),
    make_event("Study: Networks Notes", "study", "Networks", 5, 10, 0, 1.5, "#43D9AD"),
    make_event("Group Study: AI/ML", "study", "AI/ML", 6, 14, 0, 2, "#43D9AD", "Library Room 3"),

    # ── Assignments ───────────────────────────────────────────────────────────
    make_event("Submit: SE Assignment 2", "assignment", "SE", 5, 23, 59, 0.5, "#FFB648"),
    make_event("Submit: DBMS Project", "assignment", "DBMS", 10, 23, 59, 0.5, "#FFB648"),
    make_event("Submit: Networks Lab Report", "assignment", "Networks", 6, 23, 59, 0.5, "#FFB648"),
]


DEMO_ASSIGNMENTS_RAW = [
    {
        "id": str(uuid.uuid4()),
        "title": "Software Engineering Assignment 2",
        "subject": "SE",
        "description": "Design a UML diagram for a Library Management System and write a 10-page report.",
        "due_date": now_ist().replace(hour=23, minute=59) + timedelta(days=5),
        "priority": "high",
        "status": "in_progress",
        "estimated_hours": 6.0,
        "created_at": now_ist() - timedelta(days=3),
    },
    {
        "id": str(uuid.uuid4()),
        "title": "DBMS Project – Phase 2",
        "subject": "DBMS",
        "description": "Implement the ER model in PostgreSQL. Write stored procedures for CRUD operations.",
        "due_date": now_ist().replace(hour=23, minute=59) + timedelta(days=10),
        "priority": "high",
        "status": "pending",
        "estimated_hours": 12.0,
        "created_at": now_ist() - timedelta(days=1),
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Computer Networks Lab Report",
        "subject": "Networks",
        "description": "Document the socket programming experiments from Exp 4 and Exp 5.",
        "due_date": now_ist().replace(hour=23, minute=59) + timedelta(days=6),
        "priority": "medium",
        "status": "pending",
        "estimated_hours": 3.0,
        "created_at": now_ist() - timedelta(days=2),
    },
    {
        "id": str(uuid.uuid4()),
        "title": "AI/ML Assignment – Linear Regression",
        "subject": "AI/ML",
        "description": "Implement Linear & Polynomial Regression on the provided dataset. Compare accuracy metrics.",
        "due_date": now_ist().replace(hour=23, minute=59) + timedelta(days=12),
        "priority": "medium",
        "status": "pending",
        "estimated_hours": 4.0,
        "created_at": now_ist() - timedelta(days=1),
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Mathematics Problem Set 7",
        "subject": "Mathematics",
        "description": "Solve all 20 problems from Chapter 7: Differential Equations.",
        "due_date": now_ist().replace(hour=23, minute=59) + timedelta(days=2),
        "priority": "high",
        "status": "pending",
        "estimated_hours": 3.0,
        "created_at": now_ist(),
    },
]
