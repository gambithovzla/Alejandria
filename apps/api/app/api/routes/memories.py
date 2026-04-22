from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.memory_repository import MemoryRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.memory import MemoryItem, MemoryUpdate

router = APIRouter()


@router.patch("/projects/{project_id}/memories/{memory_id}", response_model=MemoryItem)
def update_project_memory(project_id: str, memory_id: str, payload: MemoryUpdate, db: Session = Depends(get_db)) -> MemoryItem:
    project = ProjectRepository(db).get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    repository = MemoryRepository(db)
    memory = repository.get_for_project(project_id=project_id, memory_id=memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    updated_memory = repository.update(memory, payload)
    db.commit()
    db.refresh(updated_memory)
    return MemoryItem.model_validate(updated_memory)
