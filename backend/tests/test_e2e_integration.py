import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.conversation_store import conversation_store
from backend.app.schemas.agent import EventType

@pytest.mark.asyncio
async def test_full_e2e_agent_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res_health = await client.get("/api/health")
        assert res_health.status_code == 200

        # 2. Settings check
        res_settings = await client.get("/api/settings/status")
        assert res_settings.status_code == 200
        assert "selected_model" in res_settings.json()

        # 3. Create conversation
        res_conv = await client.post("/api/conversations")
        assert res_conv.status_code == 200
        conv_id = res_conv.json()["id"]

        # 4. Stream chat with mocked Gemini to verify SSE stream pipeline end-to-end
        mock_fc = MagicMock()
        mock_fc.name = "web_search"
        mock_fc.args = {"query": "Next generation AI models"}

        resp1 = MagicMock()
        resp1.function_calls = [mock_fc]
        resp1.text = None

        resp2 = MagicMock()
        resp2.function_calls = None
        resp2.text = "Here is the synthesized research with citations [1]."

        with patch("backend.app.agent.controller.GeminiClient") as MockClientClass:
            mock_instance = MagicMock()
            mock_instance.is_configured = True
            mock_instance.generate = AsyncMock(side_effect=[resp1, resp2])
            MockClientClass.return_value = mock_instance

            # Also mock search tool to be fast & deterministic
            with patch("backend.app.agent.controller.SearchTool") as MockSearchClass:
                from backend.app.schemas.agent import SearchResultItem
                mock_search_instance = MagicMock()
                mock_search_instance.search = AsyncMock(return_value=[
                    SearchResultItem(
                        title="AI Breakthroughs",
                        url="https://example.com/ai",
                        snippet="Latest benchmarks and reasoning developments",
                        domain="example.com"
                    )
                ])
                MockSearchClass.return_value = mock_search_instance

                # POST to /api/agent/stream
                stream_res = await client.post(
                    "/api/agent/stream",
                    json={
                        "message": "Research next gen AI models",
                        "conversation_id": conv_id,
                        "model": "gemini-3.5-flash-lite",
                        "max_iterations": 3
                    }
                )

                assert stream_res.status_code == 200
                assert "text/event-stream" in stream_res.headers["content-type"]

                # Parse SSE events from stream text
                body = stream_res.text
                events_received = []
                for line in body.split("\n"):
                    if line.startswith("event: "):
                        events_received.append(line.replace("event: ", "").strip())

                assert EventType.AGENT_STARTED.value in events_received
                assert EventType.PLANNING.value in events_received
                assert EventType.TOOL_CALL.value in events_received
                assert EventType.TOOL_STARTED.value in events_received
                assert EventType.TOOL_RESULT.value in events_received
                assert EventType.OBSERVATION.value in events_received
                assert EventType.FINAL_ANSWER.value in events_received
                assert EventType.AGENT_COMPLETED.value in events_received

        # 5. Verify conversation store now contains the messages
        saved_conv = await conversation_store.get_conversation(conv_id)
        assert saved_conv is not None
        assert len(saved_conv.messages) >= 2
        assert saved_conv.messages[0].role == "user"
        assert saved_conv.messages[1].role == "assistant"
        assert len(saved_conv.messages[1].sources) == 1

        # 6. Test rename conversation
        rename_res = await client.patch(f"/api/conversations/{conv_id}", json={"title": "Updated AI Research"})
        assert rename_res.status_code == 200
        assert rename_res.json()["title"] == "Updated AI Research"

        # 7. Test clear messages
        clear_res = await client.post(f"/api/conversations/{conv_id}/clear")
        assert clear_res.status_code == 200
        assert len(clear_res.json()["messages"]) == 0

        # 8. Test delete conversation
        del_res = await client.delete(f"/api/conversations/{conv_id}")
        assert del_res.status_code == 200
        assert del_res.json()["deleted"] is True
