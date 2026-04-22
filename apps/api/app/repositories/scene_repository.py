from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.approval import Approval
from app.models.scene import Scene
from app.schemas.scene import SceneCreate
from app.services.scene_workflow_service import SceneWorkflowService


class SceneRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, scene_id: str) -> Scene | None:
        return self.db.get(Scene, scene_id)

    def get_detail(self, scene_id: str) -> Scene | None:
        stmt = (
            select(Scene)
            .options(selectinload(Scene.audits), selectinload(Scene.project))
            .where(Scene.id == scene_id)
        )
        scene = self.db.scalar(stmt)
        if scene is None:
            return None
        return self.hydrate(scene)

    def create(self, project_id: str, payload: SceneCreate) -> Scene:
        sequence_no = payload.sequence_no
        if sequence_no is None:
            next_sequence = self.db.scalar(select(func.coalesce(func.max(Scene.sequence_no), 0) + 1).where(Scene.project_id == project_id))
            sequence_no = int(next_sequence or 1)

        scene = Scene(
            project_id=project_id,
            sequence_no=sequence_no,
            chapter_label=payload.chapter_label,
            title=payload.title,
            purpose=payload.purpose,
            brief=payload.brief,
            pov_character=payload.pov_character,
            location=payload.location,
            status="backlog",
        )
        self.db.add(scene)
        self.db.flush()
        return scene

    def hydrate(self, scene: Scene) -> Scene:
        scene_approvals = list(
            self.db.scalars(
                select(Approval)
                .where(Approval.target_type == "scene", Approval.target_id == scene.id)
                .order_by(Approval.created_at.desc())
            )
        )
        audit_ids = [audit.id for audit in scene.audits]
        audit_approvals = []
        if audit_ids:
            audit_approvals = list(
                self.db.scalars(
                    select(Approval)
                    .where(Approval.target_type == "audit", Approval.target_id.in_(audit_ids))
                    .order_by(Approval.created_at.desc())
                )
            )
        audit_approval_map: dict[str, list[Approval]] = {}
        for approval in audit_approvals:
            audit_approval_map.setdefault(approval.target_id, []).append(approval)
        for audit in scene.audits:
            setattr(audit, "approvals", audit_approval_map.get(audit.id, []))
        scene.audits.sort(key=lambda audit: audit.created_at, reverse=True)
        setattr(scene, "approvals", scene_approvals)
        setattr(scene, "workflow", SceneWorkflowService.build_snapshot(scene))
        return scene
