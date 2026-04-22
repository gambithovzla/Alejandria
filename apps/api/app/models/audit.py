from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin


class Audit(IdMixin, TimestampMixin, Base):
    __tablename__ = "audits"

    scene_id: Mapped[str] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"))
    audit_type: Mapped[str] = mapped_column(String(40))
    decision: Mapped[str] = mapped_column(String(40))
    summary: Mapped[str] = mapped_column(Text)
    findings: Mapped[list] = mapped_column(JSON, default=list)
    next_steps: Mapped[list] = mapped_column(JSON, default=list)
    human_review_required: Mapped[bool] = mapped_column(Boolean, default=False)

    scene = relationship("Scene", back_populates="audits")
