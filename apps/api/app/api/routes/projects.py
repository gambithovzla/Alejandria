from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.pipeline_run_repository import PipelineRunRepository
from app.repositories.scene_repository import SceneRepository
from app.schemas.export import ProjectExport
from app.schemas.pipeline import PipelineRunSummary
from app.schemas.project import ProjectCreate, ProjectDetail, ProjectSummary
from app.schemas.scene import SceneCreate, SceneSummary
from app.services.export_service import ExportService
from app.services.import_service import ImportService

router = APIRouter()


@router.get("", response_model=list[ProjectSummary])
def list_projects(db: Session = Depends(get_db)) -> list[ProjectSummary]:
    projects = ProjectRepository(db).list_all()
    return [ProjectSummary.model_validate(project) for project in projects]


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectDetail:
    repository = ProjectRepository(db)
    project = repository.create(payload)
    db.commit()
    return ProjectDetail.model_validate(repository.get_detail(project.id))


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: str, db: Session = Depends(get_db)) -> ProjectDetail:
    project = ProjectRepository(db).get_detail(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectDetail.model_validate(project)


@router.post("/{project_id}/scenes", response_model=SceneSummary, status_code=status.HTTP_201_CREATED)
def create_scene(project_id: str, payload: SceneCreate, db: Session = Depends(get_db)) -> SceneSummary:
    project_repository = ProjectRepository(db)
    if project_repository.get(project_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    scene = SceneRepository(db).create(project_id=project_id, payload=payload)
    db.commit()
    return SceneSummary.model_validate(SceneRepository(db).get_detail(scene.id))


@router.get("/{project_id}/pipeline-runs", response_model=list[PipelineRunSummary])
def list_project_pipeline_runs(project_id: str, db: Session = Depends(get_db)) -> list[PipelineRunSummary]:
    project_repository = ProjectRepository(db)
    if project_repository.get(project_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    runs = PipelineRunRepository(db).list_for_project(project_id)
    return [PipelineRunSummary.model_validate(run) for run in runs]


@router.get("/{project_id}/export/json", response_model=ProjectExport)
def export_project_json(project_id: str, db: Session = Depends(get_db)) -> ProjectExport:
    export_service = ExportService(db)
    export_payload = export_service.export_project(project_id)
    if export_payload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return export_payload


@router.get("/{project_id}/export/markdown")
def export_project_markdown(project_id: str, db: Session = Depends(get_db)) -> Response:
    export_service = ExportService(db)
    markdown = export_service.export_markdown(project_id)
    if markdown is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return Response(content=markdown, media_type="text/markdown; charset=utf-8")


@router.post("/import", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def import_project(payload: ProjectExport, db: Session = Depends(get_db)) -> ProjectDetail:
    project = ImportService(db).import_project(payload)
    db.commit()
    return ProjectDetail.model_validate(ProjectRepository(db).get_detail(project.id))
