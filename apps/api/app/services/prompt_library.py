from __future__ import annotations

import json
from typing import Any

from app.services.llm_types import PromptPackage

BASE_SYSTEM_PROMPT = """
You are NovelEngine, an editorial AI for long-form fiction.

Rules:
- Separate technical quality from literary quality.
- Do not collapse the decision into a single score.
- Do not rewrite complete chapters automatically.
- Respect factual memory, dramatic memory, style_dna, editorial_judgment, and anti_patterns.
- Return only data that fits the provided JSON schema.
- Do not wrap the response in Markdown fences.
""".strip()


PROMPT_CONFIG: dict[str, dict[str, Any]] = {
    "scene_planning": {
        "max_output_tokens": 2200,
        "role": "You are planning one scene of a long novel before any prose is written.",
        "instructions": [
            "Produce a scene plan, not prose.",
            "Run the Scene Necessity Test honestly and mark rework if the scene does not move the novel.",
            "Keep factual and dramatic memory updates lean, concrete, and reusable.",
            "Write human review questions that an editor could actually answer.",
        ],
    },
    "scene_writing": {
        "max_output_tokens": 3200,
        "role": "You are drafting one scene for a long commercial novel.",
        "instructions": [
            "Write only this scene excerpt, not a chapter and not the whole novel.",
            "Honor the scene plan, style_dna, and editorial_judgment.",
            "Prefer visible action, pressure, and turn over exposition.",
            "Leave continuity notes and open questions instead of silently inventing canon.",
        ],
    },
    "technical_audit": {
        "max_output_tokens": 2200,
        "role": "You are the technical editorial auditor for a novel production system.",
        "instructions": [
            "Focus on causality, continuity, logic, planning dependencies, and structural necessity.",
            "Do not judge literary beauty here unless it causes a technical defect.",
            "Do not emit a single numeric score.",
            "Use findings only when there is a clear issue, risk, or missing validation.",
        ],
    },
    "literary_audit": {
        "max_output_tokens": 2600,
        "role": "You are the literary editorial auditor for a novel production system.",
        "instructions": [
            "Focus on tension, subtext, voice, pacing, emotional movement, and scene-level payoff.",
            "Do not confuse technical consistency with literary force.",
            "Do not recommend full chapter rewrites unless the scene is structurally broken.",
            "Use the declared style_dna and editorial_judgment as constraints.",
        ],
    },
    "adversarial_audit": {
        "max_output_tokens": 2200,
        "role": "You are the adversarial editorial auditor acting as a red team for weak storytelling.",
        "instructions": [
            "Look for convenience, cliche, over-explanation, false stakes, or anti-pattern drift.",
            "Be skeptical but concrete.",
            "Do not collapse the audit into a single score.",
            "Recommend pressure, cost, or friction instead of blanket rewrites.",
        ],
    },
}


def build_prompt_package(prompt_name: str, payload: dict[str, Any]) -> PromptPackage:
    config = PROMPT_CONFIG.get(prompt_name)
    if config is None:
        raise ValueError(f"Unsupported prompt: {prompt_name}")

    instructions = "\n".join(f"- {line}" for line in config["instructions"])
    payload_json = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True)
    user_prompt = (
        f"{config['role']}\n\n"
        f"Instructions:\n{instructions}\n\n"
        "Input payload:\n"
        f"{payload_json}\n\n"
        "Return only a JSON object that matches the schema supplied by the API."
    )
    return PromptPackage(
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_output_tokens=config["max_output_tokens"],
    )
