import asyncio
import logging
from typing import AsyncGenerator, Dict, Optional
from backend.app.schemas.chat import ChatRequest, MessageItem
from backend.app.schemas.agent import AgentEvent, EventType, SearchResultItem
from backend.app.agent.events import EventFactory
from backend.app.agent.loop import ReActAgentLoop
from backend.app.llm.gemini_client import GeminiClient
from backend.app.tools.registry import ToolRegistry
from backend.app.tools.search_tool import SearchTool
from backend.app.services.conversation_store import conversation_store

logger = logging.getLogger(__name__)

class AgentController:
    """
    Coordinates agent execution requests, cancellation mechanisms, and conversation updates.
    """

    def __init__(self):
        self._active_runs: Dict[str, asyncio.Event] = {}

    def cancel_run(self, session_id: str) -> bool:
        """Signal cancellation for an active run."""
        event = self._active_runs.get(session_id)
        if event:
            event.set()
            logger.info(f"Cancellation requested for session {session_id}")
            return True
        return False

    async def stream_chat(
        self,
        request: ChatRequest,
        session_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Coordinate execution of a user query through the ReAct loop and stream SSE.
        """
        cancel_event = asyncio.Event()
        self._active_runs[session_id] = cancel_event

        # Ensure conversation exists and store user message
        conv_id = request.conversation_id or session_id
        user_msg = MessageItem(
            role="user",
            content=request.message
        )
        await conversation_store.add_message(conv_id, user_msg)

        # Retrieve previous messages for context
        conv = await conversation_store.get_conversation(conv_id)
        history = [m for m in conv.messages if m.id != user_msg.id] if conv else []

        # Prepare client and tools
        gemini_client = GeminiClient(api_key=request.api_key)
        search_tool = SearchTool(provider=request.search_provider)
        tool_registry = ToolRegistry(search_tool=search_tool)

        agent_loop = ReActAgentLoop(
            gemini_client=gemini_client,
            tool_registry=tool_registry,
            model=request.model,
            max_iterations=request.max_iterations or 5
        )

        final_answer = ""
        accumulated_sources = []
        steps_summary = []
        total_iterations = 1

        try:
            async for event in agent_loop.run(
                user_query=request.message,
                conversation_history=history,
                cancellation_event=cancel_event
            ):
                # Intercept final answer to persist in conversation
                if event.event == EventType.FINAL_ANSWER:
                    final_answer = event.data.get("answer", "")
                    sources_data = event.data.get("sources", [])
                    accumulated_sources = [SearchResultItem(**s) for s in sources_data]
                    steps_summary = event.data.get("steps", [])
                    total_iterations = event.data.get("total_iterations", 1)

                # Stream SSE formatted event
                yield EventFactory.to_sse(event)

            # Persist assistant response
            if final_answer:
                assistant_msg = MessageItem(
                    role="assistant",
                    content=final_answer,
                    sources=accumulated_sources,
                    steps=steps_summary,
                    iteration_count=total_iterations
                )
                await conversation_store.add_message(conv_id, assistant_msg)

        except asyncio.CancelledError:
            logger.info(f"Client disconnected or cancelled session {session_id}")
            err_event = EventFactory.create(
                event_type=EventType.AGENT_COMPLETED,
                step_title="Disconnected",
                step_description="Client connection was closed.",
                data={"cancelled": True}
            )
            yield EventFactory.to_sse(err_event)
        except Exception as e:
            logger.error(f"Fatal error in stream_chat: {e}", exc_info=True)
            err_event = EventFactory.create(
                event_type=EventType.AGENT_ERROR,
                step_title="Internal System Error",
                step_description=str(e),
                error=str(e)
            )
            yield EventFactory.to_sse(err_event)
        finally:
            self._active_runs.pop(session_id, None)

agent_controller = AgentController()
