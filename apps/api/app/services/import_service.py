from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.enums import SceneStatus
from app.models.approval import Approval
from app.models.audit import Audit
from app.models.draft_version import SceneDraftVersion
from app.models.memory import ProjectMemory
from app.models.pipeline_run import PipelineRun
from app.models.scene import Scene
from app.repositories.project_repository import ProjectRepository
from app.schemas.export import ProjectExport


class ImportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repository = ProjectRepository(db)

    def import_project(self, payload: ProjectExport):
        project = self.project_repository.create(payload.project)
        scene_id_map: dict[str, str] = {}

        for scene_payload in payload.project.scenes:
            original_scene_id = scene_payload.id
            scene = Scene(
                project_id=project.id,
                sequence_no=scene_payload.sequence_no,
                chapter_label=scene_payload.chapter_label,
                title=scene_payload.title,
                purpose=scene_payload.purpose,
                brief=scene_payload.brief,
                pov_character=scene_payload.pov_character,
                location=scene_payload.location,
                status=scene_payload.status or SceneStatus.BACKLOG.value,
                planning_payload=scene_payload.planning_payload.model_dump(mode="json") if scene_payload.planning_payload else None,
                necessity_assessment=scene_payload.necessity_assessment.model_dump(mode="json") if scene_payload.necessity_assessment else None,
                draft_markdown=scene_payload.draft_markdown,
            )
            self.db.add(scene)
            self.db.flush()
            scene_id_map[original_scene_id] = scene.id

            for version_payload in scene_payload.draft_versions:
                self.db.add(
                    SceneDraftVersion(
                        scene_id=scene.id,
                        version_no=version_payload.version_no,
                        source_type=version_payload.source_type,
                        source_label=version_payload.source_label,
                        draft_markdown=version_payload.draft_markdown,
                        change_summary=version_payload.change_summary,
                        editorial_rationale=version_payload.editorial_rationale,
                        based_on_version_id=None,
                        is_active=version_payload.is_active,
                        activated_at=version_payload.activated_at,
                    )
                )

            for audit_payload in scene_payload.audits:
                audit = Audit(
                    scene_id=scene.id,
                    audit_type=audit_payload.audit_type,
                    decision=audit_payload.decision,
                    summary=audit_payload.summary,
                    findings=[finding.model_dump(mode="json") for finding in audit_payload.findings],
                    next_steps=audit_payload.next_steps,
                    human_review_required=audit_payload.human_review_required,
                )
                self.db.add(audit)
                self.db.flush()

                for approval_payload in audit_payload.approvals:
                    self.db.add(
                        Approval(
                            target_type="audit",
                            target_id=audit.id,
                            decision=approval_payload.decision,
                            reviewer=approval_payload.reviewer,
                            notes=approval_payload.notes,
                        )
                    )

            for approval_payload in scene_payload.approvals:
                self.db.add(
                    Approval(
                        target_type="scene",
                        target_id=scene.id,
                        decision=approval_payload.decision,
                        reviewer=approval_payload.reviewer,
                        notes=approval_payload.notes,
                    )
                )

        for memory in payload.project.memories:
            self.db.add(
                ProjectMemory(
                    project_id=project.id,
                    source_scene_id=scene_id_map.get(memory.source_scene_id) if memory.source_scene_id else None,
                    kind=memory.kind,
                    key=memory.key,
                    statement=memory.statement,
                    status=memory.status,
                    notes=memory.notes,
                )
            )

        for run in payload.pipeline_runs:
            self.db.add(
                PipelineRun(
                    project_id=project.id,
                    scene_id=scene_id_map.get(run.scene_id) if run.scene_id else None,
                    pipeline_type=run.pipeline_type,
                    status=run.status,
                    input_payload=run.input_payload,
                    output_payload=run.output_payload,
                    error_message=run.error_message,
                )
            )

        self.db.flush()
        return project
