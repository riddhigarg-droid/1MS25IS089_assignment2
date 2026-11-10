import os
import logging
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError
from backend.app.config import settings

logger = logging.getLogger(__name__)

class GeminiClient:
    """
    Wrapper for Google GenAI SDK client.
    Handles client initialization, connection checks, and content generation.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        self._client: Optional[genai.Client] = None
        if self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                self._client = None

    @property
    def is_configured(self) -> bool:
        return bool(self._client and self.api_key)

    def get_client(self) -> genai.Client:
        if not self._client:
            # Try re-initializing if key was updated in env or settings
            curr_key = self.api_key or settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
            if curr_key:
                self.api_key = curr_key
                self._client = genai.Client(api_key=curr_key)
            else:
                raise ValueError(
                    "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file "
                    "or enter it in the NEXUS Settings panel."
                )
        return self._client

    async def check_connection(self) -> Dict[str, Any]:
        """
        Verify Gemini API connection status.
        """
        if not self.is_configured:
            return {
                "connected": False,
                "model": settings.default_model,
                "message": "Gemini API key is not configured. Add your key in .env or Settings."
            }
        try:
            client = self.get_client()
            # Lightweight test call
            res = client.models.generate_content(
                model=settings.default_model,
                contents="Ping",
                config=types.GenerateContentConfig(
                    max_output_tokens=5,
                    temperature=0.0
                )
            )
            return {
                "connected": True,
                "model": settings.default_model,
                "message": "Connected to Gemini API"
            }
        except APIError as e:
            logger.warning(f"Gemini API test call error: {e}")
            return {
                "connected": False,
                "model": settings.default_model,
                "message": f"API Error: {e.message if hasattr(e, 'message') else str(e)}"
            }
        except Exception as e:
            logger.error(f"Gemini connection check failed: {e}")
            return {
                "connected": False,
                "model": settings.default_model,
                "message": f"Connection failed: {str(e)}"
            }

    async def generate(
        self,
        model: str,
        contents: List[types.Content],
        tools: Optional[List[types.Tool]] = None,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2
    ) -> types.GenerateContentResponse:
        """
        Generate content from Gemini with tools and system instruction.
        """
        client = self.get_client()
        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_instruction,
            tools=tools
        )
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config
        )
