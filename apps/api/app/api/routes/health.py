from fastapi import APIRouter

from app.core.config import get_settings
from app.services.provider_router import LLMProviderRouter

router = APIRouter()


@router.get("/health")
def healthcheck() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "status": "ok",
        "llmProviderMode": settings.llm_provider,
        "llmAllowMockFallback": settings.llm_allow_mock_fallback,
    }


@router.get("/health/llm")
def llm_healthcheck() -> dict[str, object]:
    settings = get_settings()
    router_service = LLMProviderRouter(settings)
    return {
        "status": "ok",
        "mode": settings.llm_provider,
        "allowMockFallback": settings.llm_allow_mock_fallback,
        "routing": router_service.describe_routing(),
    }
