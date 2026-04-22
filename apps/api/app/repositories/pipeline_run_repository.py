from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.pipeline_run import PipelineRun


class PipelineRunRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        project_id: str,
        scene_id: str | None,
        pipeline_type: str,
        status: str,
        input_payload: dict,
        output_payload: dict | None = None,
        error_message: str | None = None,
    ) -> PipelineRun:
        run = PipelineRun(
            project_id=project_id,
            scene_id=scene_id,
            pipeline_type=pipeline_type,
            status=status,
            input_payload=input_payload,
            output_payload=output_payload,
            error_message=error_message,
        )
        self.db.add(run)
        self.db.flush()
        return run

    def list_for_scene(self, scene_id: str) -> list[PipelineRun]:
        stmt = select(PipelineRun).where(PipelineRun.scene_id == scene_id).order_by(PipelineRun.created_at.desc())
        return list(self.db.scalars(stmt))

    def list_for_project(self, project_id: str) -> list[PipelineRun]:
        stmt = select(PipelineRun).where(PipelineRun.project_id == project_id).order_by(PipelineRun.created_at.desc())
        return list(self.db.scalars(stmt))
