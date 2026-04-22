from __future__ import annotations

from pydantic import Field

from app.domain.enums import MemoryKind, MemoryStatus
from app.schemas.base import StrictSchemaModel


class MemoryCandidate(StrictSchemaModel):
    key: str
    statement: str
    notes: str


class MemoryItem(StrictSchemaModel):
    id: str
    kind: MemoryKind
    key: str
    statement: str
    status: MemoryStatus
    notes: str | None
    source_scene_id: str | None


class MemoryUpdate(StrictSchemaModel):
    status: MemoryStatus
    notes: str | None = Field(default=None)
