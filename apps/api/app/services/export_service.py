from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories.pipeline_run_repository import PipelineRunRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.export import ProjectExport
from app.schemas.pipeline import PipelineRunSummary
from app.schemas.project import ProjectDetail


class ExportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repository = ProjectRepository(db)
        self.pipeline_repository = PipelineRunRepository(db)

    def export_project(self, project_id: str) -> ProjectExport | None:
        project = self.project_repository.get_detail(project_id)
        if project is None:
            return None

        runs = self.pipeline_repository.list_for_project(project_id)
        return ProjectExport(
            project=ProjectDetail.model_validate(project),
            pipeline_runs=[PipelineRunSummary.model_validate(run) for run in runs],
        )

    def export_markdown(self, project_id: str) -> str | None:
        payload = self.export_project(project_id)
        if payload is None:
            return None

        project = payload.project
        lines = [
            f"# {project.title}",
            "",
            f"**Premisa:** {project.premise}",
            f"**Genero:** {project.genre}",
            f"**Audiencia:** {project.audience}",
            "",
            "## Brief editorial",
            f"- POV narrativo: {project.narrative_pov or 'No definido'}",
            f"- Tiempo verbal: {project.tense or 'No definido'}",
            f"- Norte editorial: {project.editorial_judgment.north_star}",
            "",
            "## Escenas",
        ]

        for scene in sorted(project.scenes, key=lambda item: item.sequence_no):
            lines.extend(
                [
                    "",
                    f"### Escena {scene.sequence_no}: {scene.title}",
                    f"- Estado: {scene.status}",
                    f"- Proposito: {scene.purpose}",
                    f"- POV: {scene.pov_character or 'No definido'}",
                    f"- Lugar: {scene.location or 'No definido'}",
                    f"- Necesidad: {scene.necessity_assessment.decision if scene.necessity_assessment else 'Pendiente'}",
                    "",
                    scene.draft_markdown or "_Sin draft todavia_",
                ]
            )
        return "\n".join(lines)
