from __future__ import annotations

from typing import Any, TypeVar

from pydantic import BaseModel

from app.services.llm_types import StructuredGenerationResult
from app.services.provider_router import LLMProviderRouter

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class StructuredGenerationService:
    def __init__(self) -> None:
        self.router = LLMProviderRouter()

    def generate(self, schema: type[SchemaT], prompt_name: str, payload: dict[str, Any]) -> StructuredGenerationResult[SchemaT]:
        result = self.router.generate_structured(schema=schema, prompt_name=prompt_name, payload=payload)
        parsed = schema.model_validate(result.output)
        return StructuredGenerationResult(
            parsed=parsed,
            requested_provider=result.requested_provider,
            requested_model=result.requested_model,
            provider=result.provider,
            model=result.model,
            usage=result.usage,
            fallback_used=result.fallback_used,
            fallback_reason=result.fallback_reason,
        )
