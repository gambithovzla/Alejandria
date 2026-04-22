from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Generic, Protocol, TypeVar
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMConfigurationError(RuntimeError):
    """Raised when a provider cannot be used with the current settings."""


class LLMProviderError(RuntimeError):
    """Raised when a provider call fails or returns invalid structured output."""


@dataclass(slots=True, frozen=True)
class PromptPackage:
    system_prompt: str
    user_prompt: str
    max_output_tokens: int = 2048


@dataclass(slots=True, frozen=True)
class ProviderSelection:
    provider: str
    model: str


@dataclass(slots=True, frozen=True)
class RawLLMGenerationResult:
    output: dict[str, Any]
    requested_provider: str
    requested_model: str
    provider: str
    model: str
    fallback_used: bool = False
    fallback_reason: str | None = None


@dataclass(slots=True, frozen=True)
class StructuredGenerationResult(Generic[SchemaT]):
    parsed: SchemaT
    requested_provider: str
    requested_model: str
    provider: str
    model: str
    fallback_used: bool = False
    fallback_reason: str | None = None


class StructuredLLMProvider(Protocol):
    provider_name: str

    def generate_structured(
        self,
        *,
        schema: type[BaseModel],
        prompt_name: str,
        prompt: PromptPackage,
        payload: dict[str, Any],
        model: str,
    ) -> dict[str, Any]:
        ...


def post_json(*, url: str, headers: dict[str, str], payload: dict[str, Any], timeout: float) -> dict[str, Any]:
    request = Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise LLMProviderError(f"Provider request failed with HTTP {exc.code}: {body[:600]}") from exc
    except URLError as exc:
        raise LLMProviderError(f"Provider request failed: {exc.reason}") from exc

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise LLMProviderError(f"Provider returned invalid JSON: {body[:400]}") from exc


def parse_json_object(text: str) -> dict[str, Any]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMProviderError(f"Provider returned invalid structured output: {text[:400]}") from exc
    if not isinstance(payload, dict):
        raise LLMProviderError("Structured output must be a JSON object at the root.")
    return payload


def schema_name_for_prompt(prompt_name: str) -> str:
    return prompt_name.replace("-", "_")


def build_structured_schema(schema: type[BaseModel]) -> dict[str, Any]:
    raw_schema = schema.model_json_schema(by_alias=True)
    return _sanitize_schema(raw_schema)


def _sanitize_schema(value: Any) -> Any:
    if isinstance(value, list):
        return [_sanitize_schema(item) for item in value]
    if not isinstance(value, dict):
        return value

    unsupported_keys = {"default", "examples", "format", "title"}
    sanitized = {key: _sanitize_schema(item) for key, item in value.items() if key not in unsupported_keys}

    if sanitized.get("type") == "object" and "properties" in sanitized and "additionalProperties" not in sanitized:
        sanitized["additionalProperties"] = False

    return sanitized
