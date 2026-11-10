from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import time
from datetime import datetime, timezone

class EventType(str, Enum):
    AGENT_STARTED = "agent_started"
    PLANNING = "planning"
    TOOL_CALL = "tool_call"
    TOOL_STARTED = "tool_started"
    TOOL_RESULT = "tool_result"
    OBSERVATION = "observation"
    FINAL_ANSWER = "final_answer"
    AGENT_COMPLETED = "agent_completed"
    AGENT_ERROR = "agent_error"

class SearchResultItem(BaseModel):
    title: str
    url: str
    snippet: str
    domain: str

class ToolCallInfo(BaseModel):
    id: str
    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AgentEvent(BaseModel):
    event: EventType
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    iteration: int = 1
    step_title: str
    step_description: str
    data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

class ReActStepSummary(BaseModel):
    iteration: int
    thought: Optional[str] = None
    tool_name: Optional[str] = None
    tool_arguments: Optional[Dict[str, Any]] = None
    observation_summary: Optional[str] = None
    results_count: Optional[int] = None
    duration_ms: Optional[float] = None
