from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.draft_version import SceneDraftVersion


class SceneDraftVersionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, version_id: str) -> SceneDraftVersion | None:
        return self.db.get(SceneDraftVersion, version_id)

    def list_for_scene(self, scene_id: str) -> list[SceneDraftVersion]:
        stmt = (
            select(SceneDraftVersion)
            .where(SceneDraftVersion.scene_id == scene_id)
            .order_by(SceneDraftVersion.version_no.desc(), SceneDraftVersion.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_active(self, scene_id: str) -> SceneDraftVersion | None:
        stmt = (
            select(SceneDraftVersion)
            .where(SceneDraftVersion.scene_id == scene_id, SceneDraftVersion.is_active.is_(True))
            .order_by(SceneDraftVersion.version_no.desc())
        )
        return self.db.scalar(stmt)

    def create(
        self,
        *,
        scene_id: str,
        source_type: str,
        source_label: str,
        draft_markdown: str,
        change_summary: list[str] | None = None,
        editorial_rationale: str | None = None,
        based_on_version_id: str | None = None,
        is_active: bool = False,
        activated_at: datetime | None = None,
    ) -> SceneDraftVersion:
        version = SceneDraftVersion(
            scene_id=scene_id,
            version_no=self._next_version_no(scene_id),
            source_type=source_type,
            source_label=source_label,
            draft_markdown=draft_markdown,
            change_summary=change_summary or [],
            editorial_rationale=editorial_rationale,
            based_on_version_id=based_on_version_id,
            is_active=is_active,
            activated_at=activated_at,
        )
        self.db.add(version)
        self.db.flush()
        return version

    def activate(self, version: SceneDraftVersion, activated_at: datetime) -> SceneDraftVersion:
        for item in self.list_for_scene(version.scene_id):
            item.is_active = item.id == version.id
            if item.id == version.id:
                item.activated_at = activated_at
            self.db.add(item)
        self.db.flush()
        return version

    def _next_version_no(self, scene_id: str) -> int:
        next_value = self.db.scalar(
            select(func.coalesce(func.max(SceneDraftVersion.version_no), 0) + 1).where(SceneDraftVersion.scene_id == scene_id)
        )
        return int(next_value or 1)
