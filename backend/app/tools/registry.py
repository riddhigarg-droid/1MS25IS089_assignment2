import time
import logging
from typing import Any, Callable, Coroutine, Dict, List, Optional
from google.genai import types
from backend.app.schemas.agent import SearchResultItem
from backend.app.tools.search_tool import SearchTool

logger = logging.getLogger(__name__)

class ToolRegistry:
    """
    Registry for tools available to the ReAct agent.
    Generates tool declarations for Gemini and handles safe execution.
    """

    def __init__(self, search_tool: Optional[SearchTool] = None):
        self.search_tool = search_tool or SearchTool()
        self._declarations = [
            types.FunctionDeclaration(
                name="web_search",
                description=(
                    "Search the web for up-to-date facts, current developments, technical details, "
                    "benchmarks, comparisons, and news. Always use this tool when answering queries "
                    "that require external verification or current knowledge."
                ),
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "query": types.Schema(
                            type=types.Type.STRING,
                            description="The specific search query string to execute."
                        ),
                        "max_results": types.Schema(
                            type=types.Type.INTEGER,
                            description="Maximum number of search results to retrieve (1 to 10). Defaults to 5."
                        )
                    },
                    required=["query"]
                )
            )
        ]

    def get_tool_declaration(self) -> types.Tool:
        """Return the Gemini Tool instance containing all function declarations."""
        return types.Tool(function_declarations=self._declarations)

    async def execute_tool(
        self,
        name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the requested tool safely with timing and error isolation.
        Returns:
            Dict containing:
            - success: bool
            - results: List[Dict] or error string
            - raw_items: List[SearchResultItem] (for search)
            - duration_ms: float
            - summary: str
        """
        start_time = time.perf_counter()
        logger.info(f"Executing tool '{name}' with arguments: {arguments}")

        if name == "web_search":
            query = arguments.get("query", "")
            max_results = arguments.get("max_results", 5)
            try:
                # Type sanitization
                if isinstance(max_results, str) and max_results.isdigit():
                    max_results = int(max_results)
                elif not isinstance(max_results, int):
                    max_results = 5
            except Exception:
                max_results = 5

            try:
                items: List[SearchResultItem] = await self.search_tool.search(
                    query=query,
                    max_results=max_results
                )
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                
                # Format for Gemini model observation
                formatted_results = [
                    {
                        "title": item.title,
                        "url": item.url,
                        "snippet": item.snippet,
                        "domain": item.domain
                    }
                    for item in items
                ]

                summary = (
                    f"Retrieved {len(items)} web results for '{query}' in {duration_ms}ms"
                    if items else f"No web results found for query '{query}'"
                )

                return {
                    "success": True,
                    "results": formatted_results,
                    "raw_items": items,
                    "duration_ms": duration_ms,
                    "summary": summary
                }
            except Exception as e:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                logger.error(f"Error executing web_search tool: {e}", exc_info=True)
                return {
                    "success": False,
                    "results": [],
                    "raw_items": [],
                    "duration_ms": duration_ms,
                    "error": str(e),
                    "summary": f"Web search failed with error: {str(e)}"
                }
        else:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "success": False,
                "results": [],
                "raw_items": [],
                "duration_ms": duration_ms,
                "error": f"Unknown tool '{name}'",
                "summary": f"Tool '{name}' is not registered"
            }
