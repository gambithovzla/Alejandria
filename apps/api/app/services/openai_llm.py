from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.core.config import Settings
from app.services.llm_pricing import usage_from_openai
from app.services.llm_types import (
    LLMConfigurationError,
    ProviderStructuredResponse,
    build_structured_schema,
    parse_json_object,
    post_json,
    schema_name_for_prompt,
)


class OpenAILLMProvider:
    provider_name = "openai"

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
        if not self.settings.openai_api_key:
            raise LLMConfigurationError("NOVEL_ENGINE_OPENAI_API_KEY is required for the OpenAI provider.")

        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": prompt.system_prompt},
                {"role": "user", "content": prompt.user_prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name_for_prompt(prompt_name),
                    "schema": build_structured_schema(schema),
                    "strict": True,
                },
            },
            "max_completion_tokens": prompt.max_output_tokens,
        }
        response = post_json(
            url=f"{self.settings.openai_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
            payload=body,
            timeout=self.settings.llm_timeout_seconds,
        )
        content = response["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
        return ProviderStructuredResponse(
            output=parse_json_object(content),
            usage=usage_from_openai(response, provider=self.provider_name, model=model),
        )
