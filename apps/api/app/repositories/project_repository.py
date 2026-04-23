from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.project import Project
from app.models.scene import Scene
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.repositories.scene_repository import SceneRepository


class ProjectRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Project]:
        scene_count = func.count(Scene.id).label("scene_count")
        stmt = (
            select(Project, scene_count)
            .outerjoin(Scene, Scene.project_id == Project.id)
            .group_by(Project.id)
            .order_by(Project.updated_at.desc())
        )
        rows = self.db.execute(stmt).all()
        projects: list[Project] = []
        for project, count in rows:
            setattr(project, "scene_count", count)
            projects.append(project)
        return projects

    def get(self, project_id: str) -> Project | None:
        return self.db.get(Project, project_id)

    def get_detail(self, project_id: str) -> Project | None:
        stmt = (
            select(Project)
            .execution_options(populate_existing=True)
            .options(
                selectinload(Project.scenes).selectinload(Scene.audits),
                selectinload(Project.scenes).selectinload(Scene.draft_versions),
                selectinload(Project.memories),
            )
            .where(Project.id == project_id)
        )
        project = self.db.scalar(stmt)
        if project is None:
            return None
        scene_repository = SceneRepository(self.db)
        for scene in project.scenes:
            scene_repository.hydrate(scene)
        project.scenes.sort(key=lambda scene: scene.sequence_no)
        project.memories.sort(key=lambda memory: memory.created_at, reverse=True)
        setattr(project, "scene_count", len(project.scenes))
        return project

    def create(self, payload: ProjectCreate) -> Project:
        project = Project(
            title=payload.title,
            premise=payload.premise,
            work_type=payload.work_type,
            structure_mode=payload.structure_mode,
            genre=payload.genre,
            audience=payload.audience,
            theme=payload.theme,
            narrative_pov=payload.narrative_pov,
            tense=payload.tense,
            target_length_words=payload.target_length_words,
            style_dna=payload.style_dna.model_dump(mode="json"),
            editorial_judgment=payload.editorial_judgment.model_dump(mode="json"),
            anti_patterns=[item.model_dump(mode="json") for item in payload.anti_patterns],
            status="active",
        )
        self.db.add(project)
        self.db.flush()
        setattr(project, "scene_count", 0)
        return project

    def update(self, project: Project, payload: ProjectUpdate) -> Project:
        project.title = payload.title
        project.premise = payload.premise
        project.work_type = payload.work_type
        project.structure_mode = payload.structure_mode
        project.genre = payload.genre
        project.audience = payload.audience
        project.theme = payload.theme
        project.narrative_pov = payload.narrative_pov
        project.tense = payload.tense
        project.target_length_words = payload.target_length_words
        project.style_dna = payload.style_dna.model_dump(mode="json")
        project.editorial_judgment = payload.editorial_judgment.model_dump(mode="json")
        project.anti_patterns = [item.model_dump(mode="json") for item in payload.anti_patterns]
        self.db.add(project)
        self.db.flush()
        return project
