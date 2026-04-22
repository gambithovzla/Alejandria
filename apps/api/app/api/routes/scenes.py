from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.domain.enums import AuditType
from app.repositories.approval_repository import ApprovalRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.scene_repository import SceneRepository
from app.schemas.audit import AuditReport
from app.schemas.pipeline import PipelineRunSummary
from app.schemas.scene import SceneSummary
from app.services.pipeline_service import PipelineService
from app.services.scene_workflow_service import WorkflowConflictError

router = APIRouter()


@router.get("/{scene_id}", response_model=SceneSummary)
def get_scene(scene_id: str, db: Session = Depends(get_db)) -> SceneSummary:
    scene = SceneRepository(db).get_detail(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return SceneSummary.model_validate(scene)


@router.post("/{scene_id}/plan", response_model=SceneSummary)
def run_scene_planning(scene_id: str, db: Session = Depends(get_db)) -> SceneSummary:
    service = PipelineService(db)
    scene = service.run_scene_planning(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    db.commit()
    return SceneSummary.model_validate(SceneRepository(db).get_detail(scene.id))


@router.post("/{scene_id}/write", response_model=SceneSummary)
def run_scene_writing(scene_id: str, db: Session = Depends(get_db)) -> SceneSummary:
    service = PipelineService(db)
    try:
        scene = service.run_scene_writing(scene_id)
    except WorkflowConflictError as error:
        raise HTTPException(status_code=409, detail={"message": error.message, "blockers": error.blockers}) from error
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    db.commit()
    return SceneSummary.model_validate(SceneRepository(db).get_detail(scene.id))


@router.post("/{scene_id}/audits/{audit_type}", response_model=AuditReport)
def run_audit(scene_id: str, audit_type: AuditType, db: Session = Depends(get_db)) -> AuditReport:
    service = PipelineService(db)
    try:
        audit = service.run_audit(scene_id, audit_type)
    except WorkflowConflictError as error:
        raise HTTPException(status_code=409, detail={"message": error.message, "blockers": error.blockers}) from error
    if audit is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    db.commit()
    db.refresh(audit)
    refreshed_audit = AuditRepository(db).get(audit.id)
    if refreshed_audit is not None:
        setattr(refreshed_audit, "approvals", ApprovalRepository(db).list_for_target("audit", refreshed_audit.id))
        return AuditReport.model_validate(refreshed_audit)
    return AuditReport.model_validate(audit)


@router.get("/{scene_id}/pipeline-runs", response_model=list[PipelineRunSummary])
def list_scene_pipeline_runs(scene_id: str, db: Session = Depends(get_db)) -> list[PipelineRunSummary]:
    scene = SceneRepository(db).get(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    runs = PipelineService(db).list_runs(scene_id)
    return [PipelineRunSummary.model_validate(run) for run in runs]
