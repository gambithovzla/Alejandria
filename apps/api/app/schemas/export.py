from __future__ import annotations

from pydantic import Field

from app.schemas.base import StrictSchemaModel
from app.schemas.pipeline import PipelineRunSummary
from app.schemas.project import ProjectDetail


class ProjectExport(StrictSchemaModel):
    project: ProjectDetail
    pipeline_runs: list[PipelineRunSummary] = Field(default_factory=list)
