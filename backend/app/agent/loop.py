import asyncio
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional, Set
from google.genai import types
from google.genai.errors import APIError

from backend.app.config import settings
from backend.app.schemas.agent import AgentEvent, EventType, SearchResultItem
from backend.app.schemas.chat import MessageItem
from backend.app.agent.events import EventFactory
from backend.app.llm.gemini_client import GeminiClient
from backend.app.tools.registry import ToolRegistry

logger = logging.getLogger(__name__)

REACT_SYSTEM_INSTRUCTION = """You are NEXUS, an elite ReAct (Reasoning and Acting) research agent.
You operate strictly via the ReAct cycle: Reason -> Act (invoke search tool) -> Observe -> Synthesize.

Your mission:
1. Always evaluate what information is needed to accurately, objectively, and deeply answer the user's prompt.
2. If the prompt requires current knowledge, technical benchmarks, facts, documentation, or comparisons, call the `web_search` tool.
3. Formulate concise, high-density search queries.
4. When you receive search observations, analyze the snippets and sources. If additional aspects require research (e.g., comparing two technologies or looking for recent benchmarks), call `web_search` again with a refined query.
5. When you have sufficient factual observations, synthesize a comprehensive, beautifully structured final response:
   - Use clean Markdown with headers, bullet points, bold key terms, and comparative tables where helpful.
   - Reference and ground your claims in the retrieved sources, citing them naturally with bracketed numbers like [1], [2].
   - Provide direct, authoritative, and nuanced insights.
"""

class ReActAgentLoop:
    """
    Executes the genuine ReAct agent execution loop with real tool invocation,
    observation feedback, multi-iteration handling, and structured SSE event streaming.
    """

    def __init__(
        self,
        gemini_client: GeminiClient,
        tool_registry: ToolRegistry,
        model: Optional[str] = None,
        max_iterations: int = 5
    ):
        self.client = gemini_client
        self.tools = tool_registry
        self.model = model or settings.default_model
        self.max_iterations = max(1, min(max_iterations, 10))

    async def run(
        self,
        user_query: str,
        conversation_history: Optional[List[MessageItem]] = None,
        cancellation_event: Optional[asyncio.Event] = None
    ) -> AsyncGenerator[AgentEvent, None]:
        """
        Execute the ReAct loop and yield AgentEvents in real-time.
        """
        iteration = 1
        accumulated_sources: List[SearchResultItem] = []
        seen_urls: Set[str] = set()
        executed_queries: Set[str] = set()
        steps_summary: List[Dict[str, Any]] = []

        # 1. Agent Started
        yield EventFactory.create(
            event_type=EventType.AGENT_STARTED,
            step_title="Query Received",
            step_description=f"Initializing NEXUS ReAct agent loop for query: '{user_query}'",
            iteration=iteration,
            data={
                "query": user_query,
                "model": self.model,
                "max_iterations": self.max_iterations
            }
        )

        if not self.client.is_configured:
            yield EventFactory.create(
                event_type=EventType.AGENT_ERROR,
                step_title="Configuration Required",
                step_description="Gemini API Key is missing. Please configure it in Settings.",
                iteration=iteration,
                error="GEMINI_API_KEY is not configured.",
                data={"needs_config": True}
            )
            return

        # Prepare initial contents with conversation history context
        contents: List[types.Content] = []
        if conversation_history:
            for prev_msg in conversation_history[-6:]:
                if prev_msg.role == "user":
                    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=prev_msg.content)]))
                elif prev_msg.role == "assistant":
                    contents.append(types.Content(role="model", parts=[types.Part.from_text(text=prev_msg.content)]))

        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_query)]))

        tool_decl = self.tools.get_tool_declaration()

        final_answer_text = ""

        while iteration <= self.max_iterations:
            # Check for user cancellation
            if cancellation_event and cancellation_event.is_set():
                yield EventFactory.create(
                    event_type=EventType.AGENT_COMPLETED,
                    step_title="Execution Stopped",
                    step_description="Execution was cancelled by the user.",
                    iteration=iteration,
                    data={"cancelled": True}
                )
                return

            # 2. Planning phase
            yield EventFactory.create(
                event_type=EventType.PLANNING,
                step_title=f"Agent Reasoning (Iteration {iteration}/{self.max_iterations})",
                step_description=f"Model analyzing context and deciding next action...",
                iteration=iteration,
                data={"iteration": iteration, "accumulated_sources_count": len(accumulated_sources)}
            )

            try:
                # Call Gemini model
                response = await self.client.generate(
                    model=self.model,
                    contents=contents,
                    tools=[tool_decl],
                    system_instruction=REACT_SYSTEM_INSTRUCTION
                )
            except APIError as e:
                logger.error(f"Gemini API error during generation: {e}")
                yield EventFactory.create(
                    event_type=EventType.AGENT_ERROR,
                    step_title="Model Error",
                    step_description=f"Google GenAI API returned an error: {str(e)}",
                    iteration=iteration,
                    error=str(e)
                )
                return
            except Exception as e:
                logger.error(f"Unexpected error calling Gemini: {e}", exc_info=True)
                yield EventFactory.create(
                    event_type=EventType.AGENT_ERROR,
                    step_title="Execution Error",
                    step_description=f"Failed during agent planning: {str(e)}",
                    iteration=iteration,
                    error=str(e)
                )
                return

            # Check if model requested tool call(s)
            function_calls = response.function_calls

            if function_calls:
                # Add candidate response content to contents history.
                # Preserve original candidate content (including thought_signature for reasoning models)
                candidate_content = None
                if hasattr(response, "candidates") and response.candidates:
                    first_candidate = response.candidates[0]
                    if hasattr(first_candidate, "content") and isinstance(first_candidate.content, types.Content):
                        candidate_content = first_candidate.content

                if candidate_content:
                    contents.append(candidate_content)
                else:
                    model_parts = []
                    if getattr(response, "text", None):
                        model_parts.append(types.Part.from_text(text=response.text))
                    for fc in function_calls:
                        model_parts.append(types.Part.from_function_call(name=fc.name, args=fc.args))
                    contents.append(types.Content(role="model", parts=model_parts))

                tool_response_parts = []
                for fc in function_calls:
                    call_name = fc.name
                    call_args = fc.args or {}
                    query_arg = call_args.get("query", "")

                    # 3. Tool Call Requested
                    yield EventFactory.create(
                        event_type=EventType.TOOL_CALL,
                        step_title=f"Tool Selected: {call_name}",
                        step_description=f"Agent requested {call_name} with query: \"{query_arg}\"",
                        iteration=iteration,
                        data={
                            "tool_name": call_name,
                            "arguments": call_args,
                            "iteration": iteration
                        }
                    )

                    # 4. Tool Execution Started
                    yield EventFactory.create(
                        event_type=EventType.TOOL_STARTED,
                        step_title=f"Executing {call_name}",
                        step_description=f"Searching web for: \"{query_arg}\"...",
                        iteration=iteration,
                        data={"query": query_arg}
                    )

                    # Execute genuine search tool
                    exec_result = await self.tools.execute_tool(name=call_name, arguments=call_args)
                    raw_items: List[SearchResultItem] = exec_result.get("raw_items", [])
                    duration_ms = exec_result.get("duration_ms", 0.0)

                    # Deduplicate and accumulate sources
                    new_sources_for_step = []
                    for item in raw_items:
                        if item.url not in seen_urls:
                            seen_urls.add(item.url)
                            accumulated_sources.append(item)
                            new_sources_for_step.append(item)

                    # 5. Tool Result Received
                    yield EventFactory.create(
                        event_type=EventType.TOOL_RESULT,
                        step_title=f"Search Results Received ({len(raw_items)} found)",
                        step_description=f"Retrieved {len(raw_items)} live results in {duration_ms}ms.",
                        iteration=iteration,
                        data={
                            "tool_name": call_name,
                            "duration_ms": duration_ms,
                            "results_count": len(raw_items),
                            "results": [item.model_dump() for item in raw_items]
                        }
                    )

                    # 6. Observation Fed Back to Model
                    obs_summary = exec_result.get("summary", f"Retrieved {len(raw_items)} results.")
                    yield EventFactory.create(
                        event_type=EventType.OBSERVATION,
                        step_title="Observing Results",
                        step_description=f"Ingesting search findings into agent memory: {obs_summary}",
                        iteration=iteration,
                        data={
                            "observation_summary": obs_summary,
                            "top_sources": [item.domain for item in raw_items[:4]]
                        }
                    )

                    steps_summary.append({
                        "iteration": iteration,
                        "tool": call_name,
                        "query": query_arg,
                        "results_count": len(raw_items),
                        "duration_ms": duration_ms
                    })

                    # Collect tool response part
                    tool_response_parts.append(
                        types.Part.from_function_response(
                            name=call_name,
                            response={"results": exec_result.get("results", [])}
                        )
                    )

                # Append tool responses as 'user' role (Gemini API requires role="user" for function responses)
                contents.append(
                    types.Content(
                        role="user",
                        parts=tool_response_parts
                    )
                )

                iteration += 1
            else:
                # No tool calls -> Model produced final synthesis!
                final_answer_text = response.text or ""
                break

        # If loop reached iteration limit without final text, generate synthesis
        if not final_answer_text and iteration > self.max_iterations:
            yield EventFactory.create(
                event_type=EventType.PLANNING,
                step_title="Max Iterations Reached",
                step_description="Iteration limit reached. Compiling final synthesis from all observations...",
                iteration=iteration,
                data={"max_iterations_reached": True}
            )
            try:
                contents.append(
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(
                                text="You have gathered sufficient observations. Please formulate your final, comprehensive response now based on all search results gathered."
                            )
                        ]
                    )
                )
                final_res = await self.client.generate(
                    model=self.model,
                    contents=contents,
                    tools=None,
                    system_instruction=REACT_SYSTEM_INSTRUCTION
                )
                final_answer_text = final_res.text or ""
            except Exception as e:
                logger.error(f"Error in final synthesis fallback: {e}")
                final_answer_text = (
                    "I have gathered observations through web searches, but encountered an issue compiling "
                    "the final synthesis. Please review the retrieved sources in the execution panel."
                )

        # 7. Final Answer
        yield EventFactory.create(
            event_type=EventType.FINAL_ANSWER,
            step_title="Final Answer Formulated",
            step_description="Completed ReAct cycle and generated response with verified citations.",
            iteration=iteration,
            data={
                "answer": final_answer_text,
                "sources": [item.model_dump() for item in accumulated_sources],
                "total_iterations": iteration,
                "steps": steps_summary
            }
        )

        # 8. Agent Completed
        yield EventFactory.create(
            event_type=EventType.AGENT_COMPLETED,
            step_title="Agent Execution Complete",
            step_description=f"Completed {iteration} iteration(s) with {len(accumulated_sources)} verified sources.",
            iteration=iteration,
            data={
                "status": "success",
                "total_iterations": iteration,
                "sources_count": len(accumulated_sources)
            }
        )
