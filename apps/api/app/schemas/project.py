from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from app.domain.project_structure import default_structure_mode
from app.schemas.base import StrictSchemaModel
from app.schemas.memory import MemoryItem


class StyleDNA(StrictSchemaModel):
    voice_reference: str = "Prosa limpia, precisa y emocionalmente contenida."
    sentence_profile: str = "Frases medianas con picos de compresion en momentos de tension."
    dialogue_profile: str = "Dialogo con subtexto, evitando explicaciones frontales."
    sensory_profile: str = "Detalle sensorial selectivo y funcional a la escena."
    forbidden_moves: list[str] = Field(default_factory=lambda: ["info-dumping", "melodrama vacio"])


class EditorialJudgment(StrictSchemaModel):
    north_star: str = "Cada escena debe cambiar la historia o revelar una presion dramatica nueva."
    commercial_intent: str = "Novela larga con legibilidad alta y densidad emocional sostenida."
    priorities: list[str] = Field(default_factory=lambda: ["claridad", "continuidad", "tension"])
    non_negotiables: list[str] = Field(default_factory=lambda: ["sin score unico", "sin reescritura total de capitulos"])
    risk_tolerance: Literal["low", "medium", "high"] = "medium"


class AntiPattern(StrictSchemaModel):
    label: str
    description: str
    warning_signs: list[str]


WorkType = Literal["novel", "essay", "narrative_nonfiction", "biography", "memoir", "practical", "hybrid"]
StructureMode = Literal["scene", "section", "episode", "module"]


class ProjectEditableFields(StrictSchemaModel):
    title: str
    premise: str
    work_type: WorkType = "novel"
    structure_mode: StructureMode = "scene"
    genre: str
    audience: str
    theme: str | None = None
    narrative_pov: str | None = None
    tense: str | None = None
    target_length_words: int | None = None
    style_dna: StyleDNA = Field(default_factory=StyleDNA)
    editorial_judgment: EditorialJudgment = Field(default_factory=EditorialJudgment)
    anti_patterns: list[AntiPattern] = Field(
        default_factory=lambda: [
            AntiPattern(
                label="Conveniencia de trama",
                description="La escena resuelve problemas sin costo ni preparacion.",
                warning_signs=["coincidencia salvadora", "solucion demasiado facil"],
            )
        ]
    )

    @model_validator(mode="after")
    def normalize_structure_mode(self) -> "ProjectEditableFields":
        if not getattr(self, "structure_mode", None):
            self.structure_mode = default_structure_mode(self.work_type)
        return self


class ProjectCreate(ProjectEditableFields):
    pass


class ProjectUpdate(ProjectEditableFields):
    pass


class ProjectSummary(StrictSchemaModel):
    id: str
    title: str
    premise: str
    work_type: WorkType
    structure_mode: StructureMode
    genre: str
    audience: str
    status: str
    scene_count: int = 0
    updated_at: datetime


class ProjectDetail(ProjectSummary):
    theme: str | None
    narrative_pov: str | None
    tense: str | None
    target_length_words: int | None
    style_dna: StyleDNA
    editorial_judgment: EditorialJudgment
    anti_patterns: list[AntiPattern]
    scenes: list["SceneSummary"] = Field(default_factory=list)
    memories: list[MemoryItem] = Field(default_factory=list)


from app.schemas.scene import SceneSummary  # noqa: E402

ProjectDetail.model_rebuild()
