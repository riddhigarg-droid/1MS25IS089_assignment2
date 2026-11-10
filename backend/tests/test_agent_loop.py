import pytest
from unittest.mock import AsyncMock, MagicMock
from google.genai import types
from backend.app.agent.loop import ReActAgentLoop
from backend.app.schemas.agent import EventType

class MockGeminiClient:
    def __init__(self, responses):
        self.responses = responses
        self.call_count = 0
        self.is_configured = True
        self.recorded_contents = []

    async def generate(self, model, contents, tools=None, system_instruction=None, temperature=0.2):
        self.recorded_contents.append(list(contents))
        resp = self.responses[min(self.call_count, len(self.responses) - 1)]
        self.call_count += 1
        return resp

@pytest.mark.asyncio
async def test_react_agent_loop_full_cycle():
    # Turn 1: Model requests web_search tool call
    mock_fc = MagicMock()
    mock_fc.name = "web_search"
    mock_fc.args = {"query": "Vite React"}

    turn1_resp = MagicMock()
    turn1_resp.function_calls = [mock_fc]
    turn1_resp.text = None

    # Turn 2: Model receives observations and produces final answer
    turn2_resp = MagicMock()
    turn2_resp.function_calls = None
    turn2_resp.text = "Vite React is a lightning-fast build tool for modern web development [1]."

    mock_client = MockGeminiClient([turn1_resp, turn2_resp])

    # Tool registry with mock search tool
    mock_search = AsyncMock()
    item = MagicMock()
    item.title = "Vite"
    item.url = "https://vite.dev"
    item.snippet = "Next Generation Frontend Tooling"
    item.domain = "vite.dev"
    item.model_dump.return_value = {
        "title": item.title,
        "url": item.url,
        "snippet": item.snippet,
        "domain": item.domain
    }
    mock_search.search.return_value = [item]

    from backend.app.tools.registry import ToolRegistry
    registry = ToolRegistry(search_tool=mock_search)

    loop = ReActAgentLoop(
        gemini_client=mock_client,
        tool_registry=registry,
        max_iterations=3
    )

    events = []
    async for event in loop.run("Tell me about Vite React"):
        events.append(event)

    event_types = [e.event for e in events]

    # Verify standard ReAct event sequence
    assert EventType.AGENT_STARTED in event_types
    assert EventType.PLANNING in event_types
    assert EventType.TOOL_CALL in event_types
    assert EventType.TOOL_STARTED in event_types
    assert EventType.TOOL_RESULT in event_types
    assert EventType.OBSERVATION in event_types
    assert EventType.FINAL_ANSWER in event_types
    assert EventType.AGENT_COMPLETED in event_types

    final_event = [e for e in events if e.event == EventType.FINAL_ANSWER][0]
    assert "Vite React is a lightning-fast" in final_event.data["answer"]
    assert len(final_event.data["sources"]) == 1

    # Verify all contents sent to Gemini use valid roles (only 'user' or 'model')
    for call_contents in mock_client.recorded_contents:
        for c in call_contents:
            assert c.role in ["user", "model"], f"Role '{c.role}' is not supported by Gemini"
    
    # Verify the tool response turn has role='user'
    turn2_contents = mock_client.recorded_contents[1]
    assert turn2_contents[-1].role == "user"
    assert turn2_contents[-1].parts[0].function_response.name == "web_search"


@pytest.mark.asyncio
async def test_react_agent_loop_preserves_thought_signature():
    # Model response with candidate content containing thought_signature
    mock_fc = types.FunctionCall(name="web_search", args={"query": "Gemini 3.8"})
    fc_part = types.Part(function_call=mock_fc, thought_signature=b"encrypted_token_1234")
    turn1_candidate_content = types.Content(role="model", parts=[fc_part])

    turn1_resp = types.GenerateContentResponse(
        candidates=[types.Candidate(content=turn1_candidate_content)]
    )

    turn2_resp = types.GenerateContentResponse(
        candidates=[
            types.Candidate(
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="Final answer with citations [1]")]
                )
            )
        ]
    )

    mock_client = MockGeminiClient([turn1_resp, turn2_resp])

    mock_search = AsyncMock()
    item = MagicMock()
    item.title = "Gemini"
    item.url = "https://deepmind.google"
    item.snippet = "Gemini info"
    item.domain = "deepmind.google"
    item.model_dump.return_value = {
        "title": item.title, "url": item.url, "snippet": item.snippet, "domain": item.domain
    }
    mock_search.search.return_value = [item]

    from backend.app.tools.registry import ToolRegistry
    registry = ToolRegistry(search_tool=mock_search)

    loop = ReActAgentLoop(
        gemini_client=mock_client,
        tool_registry=registry,
        max_iterations=3
    )

    events = [e async for e in loop.run("Tell me about Gemini")]

    # Check that turn 2 contents preserved the exact model candidate content with thought_signature
    turn2_contents = mock_client.recorded_contents[1]
    model_turn = turn2_contents[1]
    assert model_turn.role == "model"
    assert model_turn.parts[0].thought_signature == b"encrypted_token_1234"
    assert model_turn.parts[0].function_call.name == "web_search"
    # And tool response turn has role='user'
    tool_turn = turn2_contents[2]
    assert tool_turn.role == "user"
    assert tool_turn.parts[0].function_response.name == "web_search"
