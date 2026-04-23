import json
from functools import lru_cache
from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="NOVEL_ENGINE_", extra="ignore")

    env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/novel_engine",
        validation_alias=AliasChoices("NOVEL_ENGINE_DATABASE_URL", "DATABASE_URL"),
    )
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:3000"])
    llm_provider: str = "router"
    llm_model: str = ""
    llm_allow_mock_fallback: bool = True
    llm_timeout_seconds: float = 60.0
    mock_llm_model: str = "novel-engine-mock"

    llm_scene_planning_provider: str = "openai"
    llm_scene_planning_model: str = "gpt-5.4-mini"
    llm_scene_writing_provider: str = "anthropic"
    llm_scene_writing_model: str = "claude-sonnet-4-6"
    llm_scene_rewrite_from_audits_provider: str = "anthropic"
    llm_scene_rewrite_from_audits_model: str = "claude-sonnet-4-6"
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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if value is None or isinstance(value, list):
            return value
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return []
            if normalized.startswith("["):
                return json.loads(normalized)
            return [item.strip() for item in normalized.split(",") if item.strip()]
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        if normalized.startswith("postgres://"):
            return "postgresql+psycopg://" + normalized[len("postgres://") :]
        if normalized.startswith("postgresql://"):
            return "postgresql+psycopg://" + normalized[len("postgresql://") :]
        return normalized


@lru_cache
def get_settings() -> Settings:
    return Settings()
