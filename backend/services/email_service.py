"""
Email reminder service using SMTP (Gmail app password supported).
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


def is_email_configured() -> bool:
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    return bool(user and password and password != "your_app_password_here")


def send_reminder_email(to_email: str, event_title: str, start_time: datetime, location: str | None = None) -> bool:
    """Send a reminder email. Returns True on success."""
    if not is_email_configured():
        print(f"[REMINDER] Email not configured — would remind {to_email} about '{event_title}'")
        return False

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    time_str = start_time.strftime("%A, %B %d at %I:%M %p")
    body = f"""Hi!

This is a reminder from Smart Timetable Assistant.

📅 Event: {event_title}
🕐 Starts: {time_str}
"""
    if location:
        body += f"📍 Location: {location}\n"
    body += "\nHave a productive day!\n— AcadeBot"

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg["Subject"] = f"Reminder: {event_title}"
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[REMINDER] Failed to send email: {e}")
        return False
