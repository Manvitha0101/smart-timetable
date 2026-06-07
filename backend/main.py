"""
FastAPI Main Entry Point - Smart Timetable Assistant Backend
"""

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from models.database import engine, AsyncSessionLocal, Event, Assignment, User
from routers import calendar, assignments, analytics, chat, auth, reminders, google_calendar
from services.demo_data import DEMO_EVENTS_RAW, DEMO_ASSIGNMENTS_RAW
from services.db_migration import run_migrations, DEMO_USER_ID
from services.reminder_scheduler import start_reminder_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database, migrate schema, and seed demo data on startup."""
    demo_user_id = await run_migrations(engine)

    demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"
    if demo_mode:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Event).where(Event.user_id == demo_user_id).limit(1)
            )
            if not result.scalar_one_or_none():
                print("[INFO] Seeding demo data...")
                for raw in DEMO_EVENTS_RAW:
                    event = Event(**raw, user_id=demo_user_id)
                    db.add(event)
                for raw in DEMO_ASSIGNMENTS_RAW:
                    assignment = Assignment(**raw, user_id=demo_user_id)
                    db.add(assignment)
                await db.commit()
                print(f"[OK] Seeded {len(DEMO_EVENTS_RAW)} events and {len(DEMO_ASSIGNMENTS_RAW)} assignments")

    start_reminder_scheduler()
    print("[START] Smart Timetable Assistant API running!")
    yield
    print("[STOP] Shutting down...")


app = FastAPI(
    title="Smart Timetable Assistant API",
    description="AI-powered academic scheduling platform",
    version="1.0.0",
    lifespan=lifespan,
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(calendar.router)
app.include_router(assignments.router)
app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(reminders.router)
app.include_router(google_calendar.router)


@app.get("/")
async def root():
    return {
        "app": "Smart Timetable Assistant",
        "version": "1.0.0",
        "status": "running",
        "demo_mode": os.getenv("DEMO_MODE", "true"),
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
