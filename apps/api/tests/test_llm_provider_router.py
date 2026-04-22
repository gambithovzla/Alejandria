from __future__ import annotations

from app.core.config import get_settings
from app.schemas.scene import SceneDraft, ScenePlan
from app.services.structured_generation import StructuredGenerationService


def _planning_payload() -> dict:
    return {
        "project": {
            "title": "Argos",
            "premise": "Una conspiracion obliga a una criptografa a leer una verdad peligrosa.",
            "style_dna": {"voice_reference": "thriller limpio y tenso"},
            "editorial_judgment": {"north_star": "claridad, ritmo y presion"},
            "anti_patterns": [{"label": "conveniencia de trama"}],
        },
        "scene": {
            "title": "Entrada al archivo",
            "purpose": "Obligar a Nora a elegir entre esconder el hallazgo o seguir investigando.",
            "brief": "Nora entra al archivo, encuentra una marca imposible y debe reaccionar antes de que llegue seguridad.",
            "pov_character": "Nora",
            "location": "el archivo sellado",
            "sequence_no": 1,
        },
    }


def _writing_payload() -> dict:
    payload = _planning_payload()
    payload["scene"]["plan"] = {
        "logline": "Nora entra al archivo para encontrar una prueba y sale con una amenaza nueva.",
        "goal": payload["scene"]["purpose"],
    }
    payload["scene"]["draft_markdown"] = None
    return payload


def test_scene_planning_uses_openai_route_and_falls_back_to_mock(monkeypatch):
    monkeypatch.setenv("NOVEL_ENGINE_LLM_PROVIDER", "router")
    monkeypatch.delenv("NOVEL_ENGINE_OPENAI_API_KEY", raising=False)
    get_settings.cache_clear()

    service = StructuredGenerationService()
    result = service.generate(ScenePlan, "scene_planning", _planning_payload())

    assert result.requested_provider == "openai"
    assert result.requested_model == "gpt-5.4-mini"
    assert result.provider == "mock"
    assert result.fallback_used is True
    assert result.fallback_reason is not None


def test_scene_writing_uses_anthropic_route_and_falls_back_to_mock(monkeypatch):
    monkeypatch.setenv("NOVEL_ENGINE_LLM_PROVIDER", "router")
    monkeypatch.delenv("NOVEL_ENGINE_ANTHROPIC_API_KEY", raising=False)
    get_settings.cache_clear()

    service = StructuredGenerationService()
    result = service.generate(SceneDraft, "scene_writing", _writing_payload())

    assert result.requested_provider == "anthropic"
    assert result.requested_model == "claude-sonnet-4-6"
    assert result.provider == "mock"
    assert result.fallback_used is True


def test_single_provider_override_can_target_kimi(monkeypatch):
    monkeypatch.setenv("NOVEL_ENGINE_LLM_PROVIDER", "kimi")
    monkeypatch.setenv("NOVEL_ENGINE_LLM_MODEL", "kimi-k2.6")
    monkeypatch.delenv("NOVEL_ENGINE_MOONSHOT_API_KEY", raising=False)
    get_settings.cache_clear()

    service = StructuredGenerationService()
    result = service.generate(ScenePlan, "scene_planning", _planning_payload())

    assert result.requested_provider == "kimi"
    assert result.requested_model == "kimi-k2.6"
    assert result.provider == "mock"
    assert result.fallback_used is True
