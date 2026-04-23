from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.enums import AuditType
from app.models.audit import Audit
from app.schemas.audit import AuditReport


class AuditRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, scene_id: str, payload: AuditReport) -> Audit:
        audit = Audit(
            scene_id=scene_id,
            audit_type=payload.audit_type,
            decision=payload.decision,
            summary=payload.summary,
            findings=[finding.model_dump(mode="json") for finding in payload.findings],
            next_steps=payload.next_steps,
            human_review_required=payload.human_review_required,
        )
        self.db.add(audit)
        self.db.flush()
        return audit

    def replace_for_scene(self, scene_id: str, audit_type: AuditType, payload: AuditReport) -> Audit:
        # Keep one record per audit run so the workflow can distinguish
        # audits that belong to the active draft version from stale ones.
        return self.create(scene_id=scene_id, payload=payload)

    def get(self, audit_id: str) -> Audit | None:
        return self.db.get(Audit, audit_id)

    def get_for_scene_type(self, *, scene_id: str, audit_type: AuditType) -> Audit | None:
        stmt = select(Audit).where(Audit.scene_id == scene_id, Audit.audit_type == audit_type.value)
        return self.db.scalar(stmt)

    def list_for_scene(self, scene_id: str) -> list[Audit]:
        stmt = select(Audit).where(Audit.scene_id == scene_id).order_by(Audit.created_at.desc())
        return list(self.db.scalars(stmt))
