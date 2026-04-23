from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.base import StrictSchemaModel


class SceneDraftVersionSummary(StrictSchemaModel):
    id: str
    scene_id: str
    version_no: int
    source_type: str
    source_label: str
    draft_markdown: str
    change_summary: list[str] = Field(default_factory=list)
    editorial_rationale: str | None = None
    based_on_version_id: str | None = None
    is_active: bool
    created_at: datetime
    activated_at: datetime | None = None
