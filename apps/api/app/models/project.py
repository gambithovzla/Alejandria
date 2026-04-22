from __future__ import annotations

from sqlalchemy import Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin


class Project(IdMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    title: Mapped[str] = mapped_column(String(255))
    premise: Mapped[str] = mapped_column(Text)
    work_type: Mapped[str] = mapped_column(String(60), default="novel")
    structure_mode: Mapped[str] = mapped_column(String(60), default="scene")
    genre: Mapped[str] = mapped_column(String(120))
    audience: Mapped[str] = mapped_column(String(120))
    theme: Mapped[str | None] = mapped_column(String(255), nullable=True)
    narrative_pov: Mapped[str | None] = mapped_column(String(120), nullable=True)
    tense: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    target_length_words: Mapped[int | None] = mapped_column(Integer, nullable=True)
    style_dna: Mapped[dict] = mapped_column(JSON, default=dict)
    editorial_judgment: Mapped[dict] = mapped_column(JSON, default=dict)
    anti_patterns: Mapped[list] = mapped_column(JSON, default=list)

    scenes = relationship("Scene", back_populates="project", cascade="all, delete-orphan")
    memories = relationship("ProjectMemory", back_populates="project", cascade="all, delete-orphan")
    pipeline_runs = relationship("PipelineRun", back_populates="project", cascade="all, delete-orphan")
