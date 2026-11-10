import logging
import urllib.parse
from typing import List, Optional
import httpx
from ddgs import DDGS
from backend.app.schemas.agent import SearchResultItem
from backend.app.config import settings

logger = logging.getLogger(__name__)

class SearchTool:
    """
    Search Tool providing genuine web search capability to the ReAct agent.
    Defaults to DuckDuckGo (zero API key needed), with optional Tavily/Serper integration.
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        tavily_api_key: Optional[str] = None,
        serper_api_key: Optional[str] = None,
        timeout_seconds: float = 12.0
    ):
        self.provider = (provider or settings.search_provider).lower()
        self.tavily_api_key = tavily_api_key or settings.tavily_api_key
        self.serper_api_key = serper_api_key or settings.serper_api_key
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def extract_domain(url: str) -> str:
        try:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc or parsed.path
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return "web"

    async def search(self, query: str, max_results: int = 5) -> List[SearchResultItem]:
        """
        Execute web search with argument validation and provider dispatch.
        """
        query = (query or "").strip()
        if not query:
            logger.warning("Empty search query provided")
            return []

        # Clamp max_results safely
        clamped_results = max(1, min(max_results, 10))

        # Check provider preference
        if self.provider == "tavily" and self.tavily_api_key:
            return await self._search_tavily(query, clamped_results)
        elif self.provider == "serper" and self.serper_api_key:
            return await self._search_serper(query, clamped_results)
        else:
            return await self._search_duckduckgo(query, clamped_results)

    async def _search_duckduckgo(self, query: str, max_results: int) -> List[SearchResultItem]:
        """
        Execute genuine DuckDuckGo search using ddgs.
        """
        results: List[SearchResultItem] = []
        try:
            # ddgs runs synchronously, we can execute via DDGS().text()
            ddgs_client = DDGS(timeout=self.timeout_seconds)
            raw_results = list(ddgs_client.text(query, max_results=max_results))
            for item in raw_results:
                url = item.get("href") or item.get("url") or ""
                title = item.get("title") or "Untitled"
                body = item.get("body") or item.get("snippet") or ""
                domain = self.extract_domain(url)
                if url:
                    results.append(
                        SearchResultItem(
                            title=title,
                            url=url,
                            snippet=body,
                            domain=domain
                        )
                    )
        except Exception as e:
            logger.error(f"DuckDuckGo search error for query '{query}': {e}", exc_info=True)
            # Fallback attempt with safe search modifier
            try:
                raw_results = list(DDGS(timeout=8.0).text(f"{query}", max_results=max_results))
                for item in raw_results:
                    url = item.get("href") or item.get("url") or ""
                    title = item.get("title") or "Untitled"
                    body = item.get("body") or item.get("snippet") or ""
                    domain = self.extract_domain(url)
                    if url:
                        results.append(SearchResultItem(title=title, url=url, snippet=body, domain=domain))
            except Exception as e2:
                logger.error(f"DuckDuckGo fallback also failed: {e2}")

        return results

    async def _search_tavily(self, query: str, max_results: int) -> List[SearchResultItem]:
        """
        Execute search using Tavily API if configured.
        """
        results: List[SearchResultItem] = []
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                res = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": self.tavily_api_key,
                        "query": query,
                        "max_results": max_results,
                        "search_depth": "basic"
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    for item in data.get("results", []):
                        url = item.get("url", "")
                        results.append(
                            SearchResultItem(
                                title=item.get("title", "Untitled"),
                                url=url,
                                snippet=item.get("content", ""),
                                domain=self.extract_domain(url)
                            )
                        )
                else:
                    logger.warning(f"Tavily returned {res.status_code}, falling back to DuckDuckGo")
                    return await self._search_duckduckgo(query, max_results)
        except Exception as e:
            logger.error(f"Tavily search error: {e}, falling back to DuckDuckGo")
            return await self._search_duckduckgo(query, max_results)

        return results

    async def _search_serper(self, query: str, max_results: int) -> List[SearchResultItem]:
        """
        Execute search using Serper (Google Search API) if configured.
        """
        results: List[SearchResultItem] = []
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                res = await client.post(
                    "https://google.serper.dev/search",
                    headers={
                        "X-API-KEY": self.serper_api_key,
                        "Content-Type": "application/json"
                    },
                    json={"q": query, "num": max_results}
                )
                if res.status_code == 200:
                    data = res.json()
                    for item in data.get("organic", []):
                        url = item.get("link", "")
                        results.append(
                            SearchResultItem(
                                title=item.get("title", "Untitled"),
                                url=url,
                                snippet=item.get("snippet", ""),
                                domain=self.extract_domain(url)
                            )
                        )
                else:
                    return await self._search_duckduckgo(query, max_results)
        except Exception as e:
            logger.error(f"Serper error: {e}, falling back to DuckDuckGo")
            return await self._search_duckduckgo(query, max_results)

        return results
