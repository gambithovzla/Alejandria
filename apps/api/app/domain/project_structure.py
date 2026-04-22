from __future__ import annotations

from typing import Final

WORK_TYPE_DEFAULT_STRUCTURE_MODE: Final[dict[str, str]] = {
    "novel": "scene",
    "essay": "section",
    "narrative_nonfiction": "episode",
    "biography": "episode",
    "memoir": "episode",
    "practical": "module",
    "hybrid": "section",
}

STRUCTURE_MODE_PLURALS: Final[dict[str, str]] = {
    "scene": "scenes",
    "section": "sections",
    "episode": "episodes",
    "module": "modules",
}

WORK_TYPE_GUIDANCE: Final[dict[str, str]] = {
    "novel": (
        "Treat each unit as a dramatic scene. Prioritize visible action, pressure, choice, reversal, and emotional movement."
    ),
    "essay": (
        "Treat each unit as an argumentative or thematic section. Use conflict to represent intellectual friction, objection, tension, or resistance instead of forcing fictional staging."
    ),
    "narrative_nonfiction": (
        "Treat each unit as a real-world episode or reported scene. Preserve factual discipline while sustaining narrative movement and explanatory clarity."
    ),
    "biography": (
        "Treat each unit as an episode in a lived life. Use context, consequence, and revelation rather than invented dramatic machinery."
    ),
    "memoir": (
        "Treat each unit as an autobiographical episode or emotional nucleus. Prioritize lived perception, memory pressure, and reflective payoff."
    ),
    "practical": (
        "Treat each unit as a module, lesson, or operational block. Use goal, conflict, turn, and outcome as learning movement, constraint, misconception, or practical friction."
    ),
    "hybrid": (
        "Treat each unit flexibly according to the declared structure_mode. Blend narrative and explanatory movement without forcing everything into scenes."
    ),
}


def default_structure_mode(work_type: str | None) -> str:
    if work_type is None:
        return "scene"
    return WORK_TYPE_DEFAULT_STRUCTURE_MODE.get(work_type, "scene")


def unit_label(structure_mode: str | None) -> str:
    if structure_mode in STRUCTURE_MODE_PLURALS:
        return str(structure_mode)
    return "unit"


def unit_label_plural(structure_mode: str | None) -> str:
    singular = unit_label(structure_mode)
    return STRUCTURE_MODE_PLURALS.get(singular, "units")


def build_structure_guidance(work_type: str | None, structure_mode: str | None) -> str:
    guidance = WORK_TYPE_GUIDANCE.get(work_type or "", WORK_TYPE_GUIDANCE["novel"])
    label = unit_label(structure_mode)
    if label == "unit":
        return guidance
    return f"{guidance} The active unit label for this project is '{label}'."
