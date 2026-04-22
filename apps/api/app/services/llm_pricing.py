from __future__ import annotations

from typing import Any

from app.services.llm_types import LLMUsageSummary

PRICE_BOOK: dict[str, dict[str, dict[str, float]]] = {
    "openai": {
        "gpt-5.4": {"input": 2.50, "cached_input": 0.25, "output": 15.00},
        "gpt-5.4-mini": {"input": 0.75, "cached_input": 0.075, "output": 4.50},
    },
    "anthropic": {
        "claude-sonnet-4-6": {"input": 3.00, "cache_write": 3.75, "cache_read": 0.30, "output": 15.00},
        "claude-opus-4-7": {"input": 5.00, "cache_write": 6.25, "cache_read": 0.50, "output": 25.00},
    },
    "kimi": {
        "kimi-k2.6": {"input": 0.95, "cached_input": 0.16, "output": 4.00},
        "kimi-k2.5": {"input": 0.60, "cached_input": 0.10, "output": 3.00},
    },
    "mock": {
        "novel-engine-mock": {"input": 0.0, "output": 0.0, "cached_input": 0.0},
    },
}


def usage_from_openai(response: dict[str, Any], provider: str, model: str) -> LLMUsageSummary | None:
    usage = response.get("usage")
    if not isinstance(usage, dict):
        return None

    prompt_tokens = _coerce_int(usage.get("prompt_tokens"))
    completion_tokens = _coerce_int(usage.get("completion_tokens"))
    total_tokens = _coerce_int(usage.get("total_tokens"))
    cached_tokens = _coerce_int((usage.get("prompt_tokens_details") or {}).get("cached_tokens")) or _coerce_int(
        usage.get("cached_tokens")
    )
    summary = LLMUsageSummary(
        input_tokens=prompt_tokens,
        output_tokens=completion_tokens,
        total_tokens=total_tokens,
        cached_input_tokens=cached_tokens,
    )
    return attach_estimated_cost(summary, provider=provider, model=model)


def usage_from_anthropic(response: dict[str, Any], provider: str, model: str) -> LLMUsageSummary | None:
    usage = response.get("usage")
    if not isinstance(usage, dict):
        return None

    input_tokens = _coerce_int(usage.get("input_tokens"))
    output_tokens = _coerce_int(usage.get("output_tokens"))
    cache_read_tokens = _coerce_int(usage.get("cache_read_input_tokens"))
    cache_write_tokens = _coerce_int(usage.get("cache_creation_input_tokens"))
    total_tokens = None
    if input_tokens is not None or output_tokens is not None or cache_read_tokens is not None or cache_write_tokens is not None:
        total_tokens = sum(value or 0 for value in [input_tokens, output_tokens, cache_read_tokens, cache_write_tokens])

    summary = LLMUsageSummary(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        cached_input_tokens=cache_read_tokens,
        cache_write_tokens=cache_write_tokens,
    )
    return attach_estimated_cost(summary, provider=provider, model=model)


def usage_from_kimi(response: dict[str, Any], provider: str, model: str) -> LLMUsageSummary | None:
    usage = response.get("usage")
    if not isinstance(usage, dict):
        return None

    summary = LLMUsageSummary(
        input_tokens=_coerce_int(usage.get("prompt_tokens")),
        output_tokens=_coerce_int(usage.get("completion_tokens")),
        total_tokens=_coerce_int(usage.get("total_tokens")),
        cached_input_tokens=_coerce_int(usage.get("cached_tokens")),
    )
    return attach_estimated_cost(summary, provider=provider, model=model)


def attach_estimated_cost(usage: LLMUsageSummary, *, provider: str, model: str) -> LLMUsageSummary:
    price = PRICE_BOOK.get(provider, {}).get(model)
    if price is None:
        return usage

    estimated_cost = 0.0

    if provider == "anthropic":
        estimated_cost += _cost_for_tokens(usage.input_tokens, price.get("input"))
        estimated_cost += _cost_for_tokens(usage.output_tokens, price.get("output"))
        estimated_cost += _cost_for_tokens(usage.cached_input_tokens, price.get("cache_read"))
        estimated_cost += _cost_for_tokens(usage.cache_write_tokens, price.get("cache_write"))
    else:
        cached_tokens = usage.cached_input_tokens or 0
        billable_input_tokens = max((usage.input_tokens or 0) - cached_tokens, 0)
        estimated_cost += _cost_for_tokens(billable_input_tokens, price.get("input"))
        estimated_cost += _cost_for_tokens(cached_tokens, price.get("cached_input"))
        estimated_cost += _cost_for_tokens(usage.output_tokens, price.get("output"))

    return LLMUsageSummary(
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        total_tokens=usage.total_tokens,
        cached_input_tokens=usage.cached_input_tokens,
        cache_write_tokens=usage.cache_write_tokens,
        estimated_cost_usd=round(estimated_cost, 6),
        currency=usage.currency,
    )


def _coerce_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _cost_for_tokens(tokens: int | None, rate_per_mtok: float | None) -> float:
    if tokens is None or rate_per_mtok is None:
        return 0.0
    return (tokens / 1_000_000) * rate_per_mtok
