from __future__ import annotations

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin


class PipelineRun(IdMixin, TimestampMixin, Base):
    __tablename__ = "pipeline_runs"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    scene_id: Mapped[str | None] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), nullable=True)
    pipeline_type: Mapped[str] = mapped_column(String(60))
    status: Mapped[str] = mapped_column(String(40))
    input_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    output_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    project = relationship("Project", back_populates="pipeline_runs")
    scene = relationship("Scene", back_populates="pipeline_runs")
