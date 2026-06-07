"""
Background scheduler that checks for due reminders and sends emails.
"""

from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, and_

from models.database import AsyncSessionLocal, Reminder, Event
from services.email_service import send_reminder_email

scheduler = AsyncIOScheduler()


async def process_due_reminders():
    """Check for unsent reminders whose remind_at time has passed."""
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        result = await db.execute(
            select(Reminder, Event)
            .join(Event, Reminder.event_id == Event.id)
            .where(and_(Reminder.is_sent == False, Reminder.remind_at <= now))
        )
        rows = result.all()

        for reminder, event in rows:
            email = reminder.email
            if not email:
                reminder.is_sent = True
                continue

            sent = send_reminder_email(email, event.title, event.start_time, event.location)
            if sent:
                reminder.is_sent = True

        if rows:
            await db.commit()


def start_reminder_scheduler():
    if not scheduler.running:
        scheduler.add_job(process_due_reminders, "interval", minutes=1, id="reminder_check")
        scheduler.start()
        print("[OK] Reminder scheduler started (checks every 1 min)")
