import os
import uuid
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.schemas.chat import (
    ChatRequest,
    Conversation,
    ConversationUpdate,
    MessageItem
)
from backend.app.agent.controller import agent_controller
from backend.app.llm.gemini_client import GeminiClient
from backend.app.tools.search_tool import SearchTool
from backend.app.services.conversation_store import conversation_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nexus-api")

app = FastAPI(
    title="NEXUS — ReAct Intelligence API",
    description="Backend engine for ReAct AI Agent with genuine search tool execution and live SSE visualization.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Health & Status Endpoints -----------------

@app.get("/api/health")
async def health_check():
    gemini = GeminiClient()
    return {
        "status": "healthy",
        "app": "NEXUS — ReAct Intelligence",
        "version": "1.0.0",
        "gemini_configured": gemini.is_configured,
        "search_provider": settings.search_provider,
        "default_model": settings.default_model
    }

@app.get("/api/settings/status")
async def get_settings_status():
    gemini = GeminiClient()
    conn_result = await gemini.check_connection() if gemini.is_configured else {
        "connected": False,
        "model": settings.default_model,
        "message": "Gemini API key is not configured."
    }

    return {
        "gemini_api_key_configured": gemini.is_configured,
        "gemini_connection": conn_result,
        "selected_model": settings.default_model,
        "available_models": [
            {"id": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash-Lite (Recommended)", "description": "Ultra-fast, lowest-cost 3.5 model for high-throughput agentic execution"},
            {"id": "gemini-3.8-flash", "name": "Gemini 3.8 Flash", "description": "High performance multimodal and tool execution"},
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "description": "Balanced agentic reasoning"},
            {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Deep multi-step reasoning"}
        ],
        "search_providers": [
            {"id": "duckduckgo", "name": "DuckDuckGo Search", "status": "Ready (No API key required)", "active": True},
            {"id": "tavily", "name": "Tavily Search", "status": "Ready" if bool(settings.tavily_api_key) else "Requires TAVILY_API_KEY", "active": bool(settings.tavily_api_key)},
            {"id": "serper", "name": "Google Serper", "status": "Ready" if bool(settings.serper_api_key) else "Requires SERPER_API_KEY", "active": bool(settings.serper_api_key)}
        ],
        "max_iterations": settings.max_iterations,
        "search_max_results": settings.search_max_results
    }

class KeyTestRequest(BaseModel):
    api_key: str
    model: Optional[str] = None

@app.post("/api/settings/test-key")
async def test_gemini_key(req: KeyTestRequest):
    client = GeminiClient(api_key=req.api_key)
    res = await client.check_connection()
    return res

# ----------------- Agent Streaming Endpoint -----------------

@app.post("/api/agent/stream")
async def stream_agent(request: ChatRequest, req: Request):
    """
    Server-Sent Events endpoint streaming the ReAct agent's live reasoning,
    tool invocation, real search observations, and final synthesis.
    """
    session_id = request.conversation_id or str(uuid.uuid4())
    logger.info(f"Initiating ReAct stream for session {session_id}: '{request.message[:50]}...'")

    async def event_generator():
        async for sse_chunk in agent_controller.stream_chat(request, session_id):
            # Check if client disconnected
            if await req.is_disconnected():
                logger.info(f"Client disconnected from session {session_id}")
                agent_controller.cancel_run(session_id)
                break
            yield sse_chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/agent/cancel/{session_id}")
async def cancel_agent_run(session_id: str):
    success = agent_controller.cancel_run(session_id)
    return {"session_id": session_id, "cancelled": success}

# ----------------- Conversation Management -----------------

@app.get("/api/conversations", response_model=List[Conversation])
async def list_conversations():
    return await conversation_store.list_conversations()

@app.post("/api/conversations", response_model=Conversation)
async def create_conversation():
    return await conversation_store.create_conversation()

@app.get("/api/conversations/{conv_id}", response_model=Conversation)
async def get_conversation(conv_id: str):
    conv = await conversation_store.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@app.patch("/api/conversations/{conv_id}", response_model=Conversation)
async def update_conversation(conv_id: str, update: ConversationUpdate):
    conv = await conversation_store.update_title(conv_id, update.title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    success = await conversation_store.delete_conversation(conv_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True, "id": conv_id}

@app.post("/api/conversations/{conv_id}/clear", response_model=Conversation)
async def clear_conversation(conv_id: str):
    conv = await conversation_store.clear_messages(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

# ----------------- Static Frontend Hosting (Unified Mode) -----------------
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

