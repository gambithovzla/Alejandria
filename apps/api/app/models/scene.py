from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin


class Scene(IdMixin, TimestampMixin, Base):
    __tablename__ = "scenes"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    sequence_no: Mapped[int] = mapped_column(Integer)
    chapter_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    purpose: Mapped[str] = mapped_column(Text)
    brief: Mapped[str] = mapped_column(Text)
    # These fields are reused as generic "focus" and "context" labels for
    # sections, episodes, and modules, so short VARCHAR columns are too tight.
    pov_character: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="backlog")
    planning_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    necessity_assessment: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    draft_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)

    project = relationship("Project", back_populates="scenes")
    audits = relationship("Audit", back_populates="scene", cascade="all, delete-orphan")
    draft_versions = relationship("SceneDraftVersion", back_populates="scene", cascade="all, delete-orphan")
    pipeline_runs = relationship("PipelineRun", back_populates="scene", cascade="all, delete-orphan")
