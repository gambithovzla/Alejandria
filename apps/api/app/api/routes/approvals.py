from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.approval_repository import ApprovalRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.scene_repository import SceneRepository
from app.schemas.approval import ApprovalCreate, ApprovalRecord

router = APIRouter()


@router.post("/scenes/{scene_id}", response_model=ApprovalRecord, status_code=status.HTTP_201_CREATED)
def create_scene_approval(scene_id: str, payload: ApprovalCreate, db: Session = Depends(get_db)) -> ApprovalRecord:
    scene_repository = SceneRepository(db)
    approval_repository = ApprovalRepository(db)
    scene = scene_repository.get_detail(scene_id)
    if scene is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    workflow = scene.workflow
    if payload.decision == "approve" and not workflow.can_approve_scene:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "Scene is not ready for approval.", "blockers": workflow.blockers},
        )

    approval = approval_repository.create_for_scene(scene_id=scene.id, payload=payload)
    stored_scene = scene_repository.get(scene.id)
    if stored_scene is not None:
        if payload.decision == "approve":
            stored_scene.status = "approved"
        else:
            stored_scene.status = "reviewing"
    db.commit()
    db.refresh(approval)
    return ApprovalRecord.model_validate(approval)


@router.post("/audits/{audit_id}", response_model=ApprovalRecord, status_code=status.HTTP_201_CREATED)
def create_audit_approval(audit_id: str, payload: ApprovalCreate, db: Session = Depends(get_db)) -> ApprovalRecord:
    audit_repository = AuditRepository(db)
    approval_repository = ApprovalRepository(db)
    audit = audit_repository.get(audit_id)
    if audit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found")

    approval = approval_repository.create_for_audit(audit_id=audit.id, payload=payload)
    scene = SceneRepository(db).get(audit.scene_id)
    if scene is not None and payload.decision != "approve":
        scene.status = "reviewing"
    db.commit()
    db.refresh(approval)
    return ApprovalRecord.model_validate(approval)
