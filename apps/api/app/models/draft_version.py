from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin


class SceneDraftVersion(IdMixin, TimestampMixin, Base):
    __tablename__ = "scene_draft_versions"

    scene_id: Mapped[str] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"))
    version_no: Mapped[int] = mapped_column(Integer)
    source_type: Mapped[str] = mapped_column(String(60))
    source_label: Mapped[str] = mapped_column(String(255))
    draft_markdown: Mapped[str] = mapped_column(Text)
    change_summary: Mapped[list] = mapped_column(JSON, default=list)
    editorial_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    based_on_version_id: Mapped[str | None] = mapped_column(ForeignKey("scene_draft_versions.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    scene = relationship("Scene", back_populates="draft_versions", foreign_keys=[scene_id])
