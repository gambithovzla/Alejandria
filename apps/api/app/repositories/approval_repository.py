from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.approval import Approval
from app.schemas.approval import ApprovalCreate


class ApprovalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_for_scene(self, scene_id: str, payload: ApprovalCreate) -> Approval:
        return self.create(target_type="scene", target_id=scene_id, payload=payload)

    def create_for_audit(self, audit_id: str, payload: ApprovalCreate) -> Approval:
        return self.create(target_type="audit", target_id=audit_id, payload=payload)

    def create(self, *, target_type: str, target_id: str, payload: ApprovalCreate) -> Approval:
        approval = Approval(
            target_type=target_type,
            target_id=target_id,
            decision=payload.decision,
            reviewer=payload.reviewer,
            notes=payload.notes,
        )
        self.db.add(approval)
        self.db.flush()
        return approval

    def list_for_target(self, target_type: str, target_id: str) -> list[Approval]:
        stmt = select(Approval).where(Approval.target_type == target_type, Approval.target_id == target_id).order_by(Approval.created_at.desc())
        return list(self.db.scalars(stmt))

    def list_for_targets(self, target_type: str, target_ids: list[str]) -> list[Approval]:
        if not target_ids:
            return []
        stmt = (
            select(Approval)
            .where(Approval.target_type == target_type, Approval.target_id.in_(target_ids))
            .order_by(Approval.created_at.desc())
        )
        return list(self.db.scalars(stmt))
