import json
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from backend.app.schemas.agent import AgentEvent, EventType

class EventFactory:
    """Helper for producing standardized AgentEvents."""

    @staticmethod
    def create(
        event_type: EventType,
        step_title: str,
        step_description: str,
        iteration: int = 1,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> AgentEvent:
        return AgentEvent(
            event=event_type,
            timestamp=datetime.now(timezone.utc).isoformat(),
            iteration=iteration,
            step_title=step_title,
            step_description=step_description,
            data=data or {},
            error=error
        )

    @staticmethod
    def to_sse(event: AgentEvent) -> str:
        """Format AgentEvent as Server-Sent Event string."""
        payload = json.dumps(event.model_dump(), ensure_ascii=False)
        return f"event: {event.event.value}\ndata: {payload}\n\n"
