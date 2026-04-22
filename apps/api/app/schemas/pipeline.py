from __future__ import annotations

from datetime import datetime

from app.domain.enums import PipelineType
from app.schemas.base import StrictSchemaModel


class PipelineRunSummary(StrictSchemaModel):
    id: str
    project_id: str
    scene_id: str | None
    pipeline_type: PipelineType
    status: str
    input_payload: dict
    output_payload: dict | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
