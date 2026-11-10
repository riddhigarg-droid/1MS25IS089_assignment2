import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # API Keys
    gemini_api_key: str = Field(default="", validation_alias="GEMINI_API_KEY")
    tavily_api_key: str = Field(default="", validation_alias="TAVILY_API_KEY")
    serper_api_key: str = Field(default="", validation_alias="SERPER_API_KEY")

    # Agent Configurations
    default_model: str = Field(default="gemini-3.5-flash-lite", validation_alias="DEFAULT_MODEL")
    max_iterations: int = Field(default=5, validation_alias="MAX_ITERATIONS")
    search_provider: str = Field(default="duckduckgo", validation_alias="SEARCH_PROVIDER")
    search_max_results: int = Field(default=5, validation_alias="SEARCH_MAX_RESULTS")
    search_timeout_seconds: float = Field(default=12.0, validation_alias="SEARCH_TIMEOUT_SECONDS")

    # Server Settings
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    port: int = 8000
    host: str = "0.0.0.0"

settings = Settings()
