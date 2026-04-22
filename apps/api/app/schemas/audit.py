from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.domain.enums import AuditDecision, AuditType
from app.schemas.approval import ApprovalRecord
from app.schemas.base import StrictSchemaModel


class AuditFinding(StrictSchemaModel):
    area: str
    severity: Literal["info", "warning", "critical"]
    issue: str
    evidence: str
    recommended_action: str
    requires_human_review: bool


class AuditReport(StrictSchemaModel):
    id: str | None = None
    audit_type: AuditType
    decision: AuditDecision
    summary: str
    findings: list[AuditFinding] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    human_review_required: bool = False
    created_at: datetime | None = None
    approvals: list[ApprovalRecord] = Field(default_factory=list)
