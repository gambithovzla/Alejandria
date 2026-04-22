from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.core.config import Settings
from app.services.llm_pricing import usage_from_anthropic
from app.services.llm_types import (
    LLMConfigurationError,
    ProviderStructuredResponse,
    build_structured_schema,
    parse_json_object,
    post_json,
)


class AnthropicLLMProvider:
    provider_name = "anthropic"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def generate_structured(
        self,
        *,
        schema: type[BaseModel],
        prompt_name: str,
        prompt,
        payload: dict[str, Any],
        model: str,
    ) -> ProviderStructuredResponse:
        if not self.settings.anthropic_api_key:
            raise LLMConfigurationError("NOVEL_ENGINE_ANTHROPIC_API_KEY is required for the Anthropic provider.")

        body = {
            "model": model,
            "max_tokens": prompt.max_output_tokens,
            "system": prompt.system_prompt,
            "messages": [{"role": "user", "content": prompt.user_prompt}],
            "output_config": {
                "format": {
                    "type": "json_schema",
                    "schema": build_structured_schema(schema),
                }
            },
        }
        response = post_json(
            url=f"{self.settings.anthropic_base_url.rstrip('/')}/messages",
            headers={
                "x-api-key": self.settings.anthropic_api_key,
                "anthropic-version": self.settings.anthropic_api_version,
            },
            payload=body,
            timeout=self.settings.llm_timeout_seconds,
        )
        content = response["content"][0]["text"]
        return ProviderStructuredResponse(
            output=parse_json_object(content),
            usage=usage_from_anthropic(response, provider=self.provider_name, model=model),
        )
