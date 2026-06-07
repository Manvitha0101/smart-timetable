from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime
from typing import Optional, List
from enum import Enum
import re


# ─── Auth Schemas ──────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8)
    institution: Optional[str] = None
    semester: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    institution: Optional[str] = None
    semester: Optional[str] = None
    avatar_color: str
    is_demo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    institution: Optional[str] = None
    semester: Optional[str] = None
    avatar_color: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutes in seconds
    user: UserResponse




class EventType(str, Enum):
    CLASS = "class"
    EXAM = "exam"
    STUDY = "study"
    ASSIGNMENT = "assignment"
    PERSONAL = "personal"


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Status(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# ─── Event Schemas ─────────────────────────────────────────────────────────────
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: EventType = EventType.CLASS
    subject: Optional[str] = None
    location: Optional[str] = None
    color: Optional[str] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    event_type: Optional[EventType] = None
    subject: Optional[str] = None
    location: Optional[str] = None
    color: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: str
    subject: Optional[str] = None
    location: Optional[str] = None
    color: str
    is_recurring: bool
    recurrence_rule: Optional[str] = None
    google_event_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConflictInfo(BaseModel):
    has_conflict: bool
    conflicting_events: List[EventResponse] = []
    severity: str = "none"  # none, soft, hard
    suggestions: List[dict] = []


class EventCreateResponse(BaseModel):
    event: EventResponse
    conflict: ConflictInfo


# ─── Assignment Schemas ────────────────────────────────────────────────────────
class AssignmentCreate(BaseModel):
    title: str
    subject: str
    description: Optional[str] = None
    due_date: datetime
    priority: Priority = Priority.MEDIUM
    estimated_hours: float = 2.0


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None
    estimated_hours: Optional[float] = None


class AssignmentResponse(BaseModel):
    id: str
    title: str
    subject: str
    description: Optional[str] = None
    due_date: datetime
    priority: str
    status: str
    estimated_hours: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Chat Schemas ──────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str
    actions_taken: List[dict] = []
    events_created: List[EventResponse] = []


# ─── Analytics Schemas ────────────────────────────────────────────────────────
class SubjectHours(BaseModel):
    subject: str
    hours: float
    color: str


class WeeklyStats(BaseModel):
    total_scheduled_hours: float
    study_hours: float
    class_hours: float
    free_hours: float
    productivity_score: int
    subject_breakdown: List[SubjectHours]
    busiest_day: str
    upcoming_deadlines: int


# ─── Reminder Schemas ─────────────────────────────────────────────────────────
class ReminderCreate(BaseModel):
    event_id: str
    remind_at: datetime
    method: str = "email"
    email: Optional[str] = None


class ReminderResponse(BaseModel):
    id: str
    event_id: str
    remind_at: datetime
    method: str
    is_sent: bool

    model_config = {"from_attributes": True}


# ─── Free Slot Schemas ────────────────────────────────────────────────────────
class FreeSlotRequest(BaseModel):
    date_from: datetime
    date_to: datetime
    duration_minutes: int = 60
    subject: Optional[str] = None


class FreeSlot(BaseModel):
    start: datetime
    end: datetime
    duration_minutes: int
