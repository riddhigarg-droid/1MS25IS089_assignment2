import pytest
from backend.app.tools.search_tool import SearchTool

@pytest.mark.asyncio
async def test_search_tool_domain_extraction():
    assert SearchTool.extract_domain("https://www.wikipedia.org/wiki/AI") == "wikipedia.org"
    assert SearchTool.extract_domain("http://github.com/fastapi/fastapi") == "github.com"
    assert SearchTool.extract_domain("invalid-url") == "invalid-url"

@pytest.mark.asyncio
async def test_search_tool_empty_query():
    tool = SearchTool()
    results = await tool.search("")
    assert results == []

@pytest.mark.asyncio
async def test_search_tool_live_execution():
    tool = SearchTool(provider="duckduckgo")
    results = await tool.search("python programming", max_results=2)
    assert len(results) > 0
    first = results[0]
    assert hasattr(first, "title")
    assert hasattr(first, "url")
    assert hasattr(first, "snippet")
    assert hasattr(first, "domain")
    assert first.domain != ""
