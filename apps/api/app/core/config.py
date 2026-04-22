from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="NOVEL_ENGINE_", extra="ignore")

    env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/novel_engine"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    llm_provider: str = "router"
    llm_model: str = ""
    llm_allow_mock_fallback: bool = True
    llm_timeout_seconds: float = 60.0
    mock_llm_model: str = "novel-engine-mock"

    llm_scene_planning_provider: str = "openai"
    llm_scene_planning_model: str = "gpt-5.4-mini"
    llm_scene_writing_provider: str = "anthropic"
    llm_scene_writing_model: str = "claude-sonnet-4-6"
    llm_technical_audit_provider: str = "openai"
    llm_technical_audit_model: str = "gpt-5.4"
    llm_literary_audit_provider: str = "anthropic"
    llm_literary_audit_model: str = "claude-opus-4-7"
    llm_adversarial_audit_provider: str = "openai"
    llm_adversarial_audit_model: str = "gpt-5.4"
    llm_kimi_default_model: str = "kimi-k2.6"

    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_api_key: str | None = None
    anthropic_base_url: str = "https://api.anthropic.com/v1"
    anthropic_api_version: str = "2023-06-01"
    moonshot_api_key: str | None = None
    moonshot_base_url: str = "https://api.moonshot.ai/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
