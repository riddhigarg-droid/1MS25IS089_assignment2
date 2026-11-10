from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone
from backend.app.schemas.agent import SearchResultItem

class MessageItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str # "user" | "assistant" | "system"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sources: List[SearchResultItem] = Field(default_factory=list)
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    iteration_count: int = 1

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    max_iterations: Optional[int] = Field(default=5, ge=1, le=10)
    search_provider: Optional[str] = None
    api_key: Optional[str] = None

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Research Chat"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    messages: List[MessageItem] = Field(default_factory=list)

class ConversationUpdate(BaseModel):
    title: str
