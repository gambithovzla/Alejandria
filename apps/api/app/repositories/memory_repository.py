from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.memory import ProjectMemory
from app.schemas.memory import MemoryCandidate, MemoryUpdate


class MemoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def replace_scene_candidates(self, project_id: str, scene_id: str, kind: str, items: list[MemoryCandidate]) -> None:
        self.db.execute(
            delete(ProjectMemory).where(
                ProjectMemory.project_id == project_id,
                ProjectMemory.source_scene_id == scene_id,
                ProjectMemory.kind == kind,
            )
        )
        for item in items:
            memory = ProjectMemory(
                project_id=project_id,
                source_scene_id=scene_id,
                kind=kind,
                key=item.key,
                statement=item.statement,
                notes=item.notes,
                status="candidate",
            )
            self.db.add(memory)
        self.db.flush()

    def list_for_project(self, project_id: str) -> list[ProjectMemory]:
        stmt = select(ProjectMemory).where(ProjectMemory.project_id == project_id).order_by(ProjectMemory.created_at.desc())
        return list(self.db.scalars(stmt))

    def get_for_project(self, *, project_id: str, memory_id: str) -> ProjectMemory | None:
        stmt = select(ProjectMemory).where(ProjectMemory.project_id == project_id, ProjectMemory.id == memory_id)
        return self.db.scalar(stmt)

    def update(self, memory: ProjectMemory, payload: MemoryUpdate) -> ProjectMemory:
        memory.status = payload.status
        memory.notes = payload.notes
        self.db.flush()
        return memory
