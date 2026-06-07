# 🎓 Smart Timetable Assistant AI Agent

> **Track B** — AI-Powered Academic Time Manager Platform with Next.js, FastAPI, LangChain & Google Calendar API

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![LangChain](https://img.shields.io/badge/LangChain-0.3-blue)](https://langchain.com)
[![Gemini](https://img.shields.io/badge/Gemini-Pro-orange)](https://aistudio.google.com)

---

## 🚀 Features

| Feature | Description |
|---|---|
| 📅 **Interactive Calendar** | FullCalendar.js with drag-and-drop, month/week/day/list views |
| 🤖 **AI Chat (AcadeBot)** | Natural language scheduling via Google Gemini Pro |
| ⚡ **Conflict Detection** | Real-time hard/soft conflict alerts with 3 alternative slots |
| 📊 **Analytics Dashboard** | Productivity score, subject hours, deadline pressure |
| 📋 **Assignment Tracker** | Priority levels, status tracking, deadline countdowns |
| 🧠 **Smart Study Planner** | Pomodoro-aware sessions from assignment priorities |
| 🔔 **Email Reminders** | Scheduled alerts 1 day / 2 hours / 30 min before events |
| 🔗 **Google Calendar Sync** | OAuth 2.0 integration (demo mode works without it) |

---

## 🏗️ Architecture

```
smart_timetable/
├── frontend/          # Next.js 14 + Tailwind + FullCalendar.js
│   ├── app/
│   │   ├── page.tsx           # Dashboard
│   │   ├── calendar/          # Interactive Calendar
│   │   ├── assignments/       # Assignment Tracker
│   │   ├── analytics/         # Analytics Dashboard
│   │   └── chat/              # AI Assistant Landing
│   └── components/
│       ├── CalendarView.tsx   # FullCalendar wrapper
│       ├── ChatPanel.tsx      # Floating AI chat
│       ├── EventModal.tsx     # Create/edit events
│       ├── ConflictAlert.tsx  # Conflict toast notifications
│       └── Sidebar.tsx        # Navigation
│
└── backend/           # FastAPI + LangChain + SQLite
    ├── main.py                # Entry point + demo data seeding
    ├── agent/
    │   ├── scheduler_agent.py # LangChain Gemini agent
    │   └── tools.py           # 7 scheduling tools
    ├── routers/               # calendar, assignments, analytics, chat
    ├── services/
    │   ├── conflict_detector.py  # Sweep-line conflict algorithm
    │   ├── study_planner.py      # Pomodoro study planner
    │   └── demo_data.py          # Realistic demo events
    └── models/                # SQLAlchemy + Pydantic schemas
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment (edit as needed)
copy .env.example .env       # Windows
cp .env.example .env         # Mac/Linux

# Start the API server
python main.py
# → Running at http://localhost:8000
# → API docs at http://localhost:8000/docs
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already done if you ran setup)
npm install

# Start development server
npm run dev
# → Running at http://localhost:3000
```

### 3. Open the App

Navigate to **http://localhost:3000** — demo data loads automatically! 🎉

---

## 🔑 API Key Configuration

### Google Gemini Pro (FREE — Full AI Chat)
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create a free API key
3. Add to `backend/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
4. Restart the backend — AcadeBot is now fully AI-powered!

### Google Calendar Sync (Optional)
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Create OAuth 2.0 credentials
4. Add to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### Email Reminders (Optional)
1. For Gmail: Enable 2FA → Settings → App Passwords → Create "Mail" password
2. Add to `backend/.env`:
   ```
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   ```

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | List all events |
| POST | `/api/events` | Create event (with conflict check) |
| PUT | `/api/events/{id}` | Update event |
| DELETE | `/api/events/{id}` | Delete event |
| POST | `/api/events/check-conflicts` | Check conflicts for a slot |
| POST | `/api/events/free-slots` | Find free time slots |
| GET | `/api/assignments` | List assignments |
| POST | `/api/assignments` | Create assignment |
| POST | `/api/assignments/study-plan` | Generate Pomodoro study plan |
| GET | `/api/analytics/overview` | Dashboard stats |
| GET | `/api/analytics/weekly` | Weekly productivity metrics |
| GET | `/api/analytics/subject-hours` | Hours by subject |
| POST | `/api/chat` | AI chat message |
| WS | `/api/chat/ws` | Streaming AI chat |

Full interactive docs: **http://localhost:8000/docs**

---

## 🤖 AI Capabilities (AcadeBot)

AcadeBot has 7 scheduling tools:

| Tool | What it does |
|---|---|
| `list_upcoming_events` | "What's on my schedule?" |
| `find_free_time` | "Find 2 free hours tomorrow" |
| `create_event` | "Schedule Physics lab Thursday 2pm-4pm" |
| `check_conflicts_for_slot` | "Am I free Friday at 10am?" |
| `list_pending_assignments` | "What assignments are due?" |
| `suggest_study_plan` | "Make a study plan for my exams" |
| `get_schedule_summary` | "Give me today's overview" |

---

## 📊 Conflict Detection Algorithm

The sweep-line algorithm (`services/conflict_detector.py`):

1. **Hard Conflict**: New event overlaps with existing event (intervals share time)
2. **Soft Conflict**: Gap between events is < 10 minutes
3. **Auto-suggestion**: Generates 3 non-conflicting alternative slots after conflict

---

## 🧠 Study Planner Algorithm

The Pomodoro study planner (`services/study_planner.py`):

1. Sort assignments by: priority weight (High=3, Medium=2, Low=1) × deadline proximity
2. Find free gaps in the schedule (7am–9pm)
3. Fill gaps with 25-minute Pomodoro sessions
4. Add 5-minute breaks (15-minute after every 4 pomodoros)
5. Skip gaps < 30 minutes

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#6C63FF` | Classes, interactive elements |
| `--secondary` | `#FF6584` | Exams, alerts |
| `--success` | `#43D9AD` | Study sessions, success |
| `--warning` | `#FFB648` | Assignments, warnings |
| `--bg` | `#0F0F1A` | Page background |
| `--surface` | `#1A1A2E` | Cards |

---

## 📅 Week-by-Week Milestones

| Week | Goal | Status |
|---|---|---|
| 1-2 | Foundation: Next.js + FastAPI + DB + demo data | ✅ |
| 3-4 | Core agent with 7 tools + conflict detection | ✅ |
| 5-6 | Study planner + assignments + analytics | ✅ |
| 7-8 | Polish: notifications + deployment + README | ✅ |

---

## 🚀 Deployment

### Backend (Railway/Render)
```bash
# Set environment variables in dashboard
# Start command:
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel)
```bash
# Set environment variable:
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Deploy:
npx vercel
```

---

## 👥 Team

Built for the **Smart Timetable Assistant AI Agent Development Project** — Track B.

**Tech Stack:** Next.js 14 · FastAPI · LangChain · SQLite · FullCalendar.js · Recharts · Gemini Pro · Tailwind CSS

---

## 📄 License

MIT License — Free to use and modify for educational purposes.
