from __future__ import annotations

from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.services.anthropic_llm import AnthropicLLMProvider
from app.services.kimi_llm import KimiLLMProvider
from app.services.llm_types import (
    LLMConfigurationError,
    LLMProviderError,
    ProviderSelection,
    RawLLMGenerationResult,
)
from app.services.mock_llm import MockLLMProvider
from app.services.openai_llm import OpenAILLMProvider
from app.services.prompt_library import build_prompt_package

TASK_SELECTION_FIELDS: dict[str, tuple[str, str]] = {
    "scene_planning": ("llm_scene_planning_provider", "llm_scene_planning_model"),
    "scene_writing": ("llm_scene_writing_provider", "llm_scene_writing_model"),
    "technical_audit": ("llm_technical_audit_provider", "llm_technical_audit_model"),
    "literary_audit": ("llm_literary_audit_provider", "llm_literary_audit_model"),
    "adversarial_audit": ("llm_adversarial_audit_provider", "llm_adversarial_audit_model"),
}


class LLMProviderRouter:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.providers = {
            "mock": MockLLMProvider(),
            "openai": OpenAILLMProvider(self.settings),
            "anthropic": AnthropicLLMProvider(self.settings),
            "kimi": KimiLLMProvider(self.settings),
        }

    def generate_structured(
        self,
        *,
        schema: type[BaseModel],
        prompt_name: str,
        payload: dict,
    ) -> RawLLMGenerationResult:
        selection = self._select_provider(prompt_name)
        prompt = build_prompt_package(prompt_name, payload)
        provider = self.providers.get(selection.provider)

        if provider is None:
            return self._fallback(
                schema=schema,
                prompt_name=prompt_name,
                payload=payload,
                selection=selection,
                reason=f"Unsupported LLM provider '{selection.provider}'.",
            )

        try:
            output = provider.generate_structured(
                schema=schema,
                prompt_name=prompt_name,
                prompt=prompt,
                payload=payload,
                model=selection.model,
            )
        except (LLMConfigurationError, LLMProviderError, OSError, ValueError) as exc:
            return self._fallback(
                schema=schema,
                prompt_name=prompt_name,
                payload=payload,
                selection=selection,
                reason=str(exc),
            )

        return RawLLMGenerationResult(
            output=output,
            requested_provider=selection.provider,
            requested_model=selection.model,
            provider=selection.provider,
            model=selection.model,
        )

    def describe_routing(self) -> dict[str, dict[str, str]]:
        return {
            prompt_name: {
                "provider": self._select_provider(prompt_name).provider,
                "model": self._select_provider(prompt_name).model,
            }
            for prompt_name in TASK_SELECTION_FIELDS
        }

    def _select_provider(self, prompt_name: str) -> ProviderSelection:
        llm_provider = self.settings.llm_provider.strip().lower()
        if llm_provider and llm_provider != "router":
            model = self.settings.llm_model or self._default_model_for_provider(llm_provider)
            return ProviderSelection(provider=llm_provider, model=model)

        provider_field, model_field = TASK_SELECTION_FIELDS[prompt_name]
        provider = getattr(self.settings, provider_field)
        model = getattr(self.settings, model_field)
        return ProviderSelection(provider=provider, model=model)

    def _fallback(
        self,
        *,
        schema: type[BaseModel],
        prompt_name: str,
        payload: dict,
        selection: ProviderSelection,
        reason: str,
    ) -> RawLLMGenerationResult:
        if not self.settings.llm_allow_mock_fallback:
            raise LLMProviderError(reason)

        mock_provider = self.providers["mock"]
        output = mock_provider.generate_structured(
            schema=schema,
            prompt_name=prompt_name,
            prompt=build_prompt_package(prompt_name, payload),
            payload=payload,
            model=self.settings.mock_llm_model,
        )
        return RawLLMGenerationResult(
            output=output,
            requested_provider=selection.provider,
            requested_model=selection.model,
            provider="mock",
            model=self.settings.mock_llm_model,
            fallback_used=True,
            fallback_reason=reason,
        )

    def _default_model_for_provider(self, provider: str) -> str:
        defaults = {
            "mock": self.settings.mock_llm_model,
            "openai": self.settings.llm_technical_audit_model,
            "anthropic": self.settings.llm_scene_writing_model,
            "kimi": self.settings.llm_kimi_default_model,
        }
        return defaults.get(provider, self.settings.mock_llm_model)
