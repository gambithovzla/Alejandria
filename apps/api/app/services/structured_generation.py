from __future__ import annotations

from typing import Any, TypeVar

from pydantic import BaseModel

from app.services.mock_llm import MockLLMProvider

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class StructuredGenerationService:
    def __init__(self) -> None:
        self.provider = MockLLMProvider()

    def generate(self, schema: type[SchemaT], prompt_name: str, payload: dict[str, Any]) -> SchemaT:
        raw_output = self.provider.generate(prompt_name, payload)
        return schema.model_validate(raw_output)
