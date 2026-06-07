"""
LangChain Scheduling Agent
Uses Google Gemini Pro (free) with custom scheduling tools.
"""

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from sqlalchemy.ext.asyncio import AsyncSession
from .tools import get_tools


SYSTEM_PROMPT = """You are AcadeBot, an intelligent academic scheduling assistant for students.
You help manage timetables, track assignments, find free time, detect scheduling conflicts, and create study plans.

Your personality: Friendly, encouraging, efficient. Use emojis appropriately.

Capabilities:
- View and create calendar events
- Find free time slots in the schedule
- Detect and resolve scheduling conflicts
- List pending assignments with deadlines
- Generate Pomodoro-based study plans
- Summarize today's schedule and upcoming exams

Guidelines:
- Always check for conflicts before creating events
- When creating events, ask for clarification if start/end times are ambiguous
- Encourage students and provide motivation
- Use IST (India Standard Time, UTC+5:30) for all times shown to the user
- Keep responses concise and actionable
- If asked to "schedule study", use suggest_study_plan tool
- Default study session duration is 25 minutes (Pomodoro)

Today's date/time: {current_datetime}
"""


def create_agent(db: AsyncSession, user_id: str) -> AgentExecutor:
    """Create and return the LangChain scheduling agent."""
    api_key = os.getenv("GEMINI_API_KEY", "")

    if not api_key or api_key == "your_gemini_api_key_here":
        # Fallback to a mock response agent for demo mode
        return None

    llm = ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        google_api_key=api_key,
        temperature=0.3,
        convert_system_message_to_human=True,
    )

    tools = get_tools(db, user_id)

    from datetime import datetime
    from zoneinfo import ZoneInfo
    current_dt = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%A, %B %d %Y at %I:%M %p IST")

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT.format(current_datetime=current_dt)),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,
        max_iterations=5,
        handle_parsing_errors=True,
        return_intermediate_steps=True,
    )
    return executor


DEMO_RESPONSES = {
    "hello": "👋 Hi! I'm AcadeBot, your smart scheduling assistant! I can help you manage your timetable, track assignments, find free time, and create study plans. What would you like to do?",
    "default": """I'm AcadeBot in demo mode! 🤖 

To enable full AI capabilities, add your **free** Gemini API key to `.env`:
```
GEMINI_API_KEY=your_key_here
```
Get it free at: [aistudio.google.com](https://aistudio.google.com)

In the meantime, here's what I can do:
📅 **View Schedule** — Check the Calendar tab
📋 **Track Assignments** — Go to Assignments tab  
📊 **View Analytics** — Check the Analytics tab
🔍 **Find Free Slots** — Use the calendar's free slot finder""",
    "schedule": "📅 I can see your schedule has been loaded! Check the Calendar view for a visual overview. Your next event is coming up soon — stay prepared! 💪",
    "exam": "📝 I see some exams coming up! Make sure to check the Assignments tab to track your preparation. Would you like me to suggest a study plan?",
    "free": "🔍 To find free time, I normally analyze your full schedule. In demo mode, check the Calendar view — unshaded blocks are your free time! Look for gaps between events.",
    "study": "📚 Great idea to plan study sessions! In the Analytics tab, you can see your current study hours. For a personalized Pomodoro plan, add your Gemini API key to enable full AI features.",
    "assignment": "📋 Your assignments are tracked in the Assignments tab! I can see you have several due soon. Check there for deadline countdowns and priority levels.",
}


async def get_demo_response(message: str) -> str:
    """Smart demo response when no API key is configured."""
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["hi", "hello", "hey", "greet"]):
        return DEMO_RESPONSES["hello"]
    elif any(w in msg_lower for w in ["exam", "test", "quiz", "midterm"]):
        return DEMO_RESPONSES["exam"]
    elif any(w in msg_lower for w in ["free", "available", "slot", "gap"]):
        return DEMO_RESPONSES["free"]
    elif any(w in msg_lower for w in ["study", "plan", "pomodoro", "prepare"]):
        return DEMO_RESPONSES["study"]
    elif any(w in msg_lower for w in ["assignment", "homework", "submit", "deadline", "due"]):
        return DEMO_RESPONSES["assignment"]
    elif any(w in msg_lower for w in ["schedule", "calendar", "class", "lecture"]):
        return DEMO_RESPONSES["schedule"]
    return DEMO_RESPONSES["default"]
