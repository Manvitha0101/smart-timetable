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


def _extract_reply(output) -> str:
    """Normalize LangChain agent output to a plain string."""
    if output is None:
        return "I couldn't process that. Please try again."
    if isinstance(output, str):
        return output
    if isinstance(output, list):
        parts = []
        for block in output:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts).strip() or "I couldn't process that. Please try again."
    return str(output)


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
            "input": payload.message,
            "chat_history": [],
        })
        return ChatResponse(
            reply=_extract_reply(result.get("output")),
            actions_taken=[
                {"tool": step[0].tool, "input": str(step[0].tool_input)}
                for step in result.get("intermediate_steps", [])
            ],
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
                        result = await agent.ainvoke({
                            "input": message,
                            "chat_history": [],
                        })
                        text = _extract_reply(result.get("output"))
                        words = text.split(" ")
                        for i, word in enumerate(words):
                            chunk = word + (" " if i < len(words) - 1 else "")
                            await websocket.send_json({"type": "chunk", "content": chunk})
                            await asyncio.sleep(0.02)
                        actions = [
                            {"tool": step[0].tool, "input": str(step[0].tool_input)}
                            for step in result.get("intermediate_steps", [])
                        ]
                        await websocket.send_json({"type": "done", "actions": actions})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "content": str(e)})

        except WebSocketDisconnect:
            pass
