import pytest
from backend.app.tools.registry import ToolRegistry

@pytest.mark.asyncio
async def test_tool_registry_declaration():
    registry = ToolRegistry()
    declaration = registry.get_tool_declaration()
    assert declaration is not None
    assert len(declaration.function_declarations) == 1
    assert declaration.function_declarations[0].name == "web_search"

@pytest.mark.asyncio
async def test_tool_registry_execution_valid():
    registry = ToolRegistry()
    result = await registry.execute_tool("web_search", {"query": "artificial intelligence", "max_results": 2})
    assert result["success"] is True
    assert "duration_ms" in result
    assert "results" in result
    assert isinstance(result["results"], list)

@pytest.mark.asyncio
async def test_tool_registry_unknown_tool():
    registry = ToolRegistry()
    result = await registry.execute_tool("unknown_tool", {})
    assert result["success"] is False
    assert "Unknown tool" in result["error"]
