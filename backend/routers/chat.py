"""
Chat Router - AI Scheduling Assistant via REST and WebSocket
"""

import json
import asyncio

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import User, AsyncSessionLocal, get_db
from models.schemas import ChatMessage, ChatResponse
from agent.scheduler_agent import create_agent, get_demo_response
from services.user_context import get_active_user
from services.auth_service import decode_access_token
from services.db_migration import DEMO_USER_ID

router = APIRouter(prefix="/api/chat", tags=["chat"])




async def _resolve_user_id(token: str | None, db: AsyncSession) -> str:
    if token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            return payload["sub"]
    return DEMO_USER_ID


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatMessage,
    user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    """REST chat endpoint (non-streaming)."""
    agent = create_agent(db, user.id)

    if agent is None:
        reply = await get_demo_response(payload.message)
        return ChatResponse(reply=reply)

    try:
        result = await agent.ainvoke({
            "messages": [("user", payload.message)],
        })
        messages = result.get("messages", [])
        reply = messages[-1].content if messages else "I couldn't process that."
        
        actions = []
        for m in messages:
            if getattr(m, "tool_calls", None):
                for tc in m.tool_calls:
                    actions.append({"tool": tc.get("name", ""), "input": str(tc.get("args", ""))})

        return ChatResponse(
            reply=reply,
            actions_taken=actions,
        )
    except Exception as e:
        return ChatResponse(reply=f"⚠️ Error: {str(e)}. Please try again.")


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket):
    """WebSocket endpoint for streaming AI responses."""
    await websocket.accept()
    token = websocket.query_params.get("token")

    async with AsyncSessionLocal() as db:
        user_id = await _resolve_user_id(token, db)
        agent = create_agent(db, user_id)

        try:
            while True:
                data = await websocket.receive_text()
                payload = json.loads(data)
                message = payload.get("message", "")

                if not message.strip():
                    continue

                if agent is None:
                    reply = await get_demo_response(message)
                    words = reply.split(" ")
                    for i, word in enumerate(words):
                        chunk = word + (" " if i < len(words) - 1 else "")
                        await websocket.send_json({"type": "chunk", "content": chunk})
                        await asyncio.sleep(0.03)
                    await websocket.send_json({"type": "done", "actions": []})
                else:
                    try:
                        result = await agent.ainvoke({"messages": [("user", message)]})
                        messages = result.get("messages", [])
                        text = messages[-1].content if messages else "I couldn't process that."
                        
                        words = text.split(" ")
                        for i, word in enumerate(words):
                            chunk = word + (" " if i < len(words) - 1 else "")
                            await websocket.send_json({"type": "chunk", "content": chunk})
                            await asyncio.sleep(0.02)
                            
                        actions = []
                        for m in messages:
                            if getattr(m, "tool_calls", None):
                                for tc in m.tool_calls:
                                    actions.append({"tool": tc.get("name", ""), "input": str(tc.get("args", ""))})
                                    
                        await websocket.send_json({"type": "done", "actions": actions})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "content": str(e)})

        except WebSocketDisconnect:
            pass
