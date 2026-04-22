from __future__ import annotations

from datetime import datetime
from typing import Literal

from app.domain.enums import ApprovalDecision
from app.schemas.base import StrictSchemaModel


class ApprovalCreate(StrictSchemaModel):
    decision: ApprovalDecision
    reviewer: str
    notes: str


class ApprovalRecord(StrictSchemaModel):
    id: str
    target_type: Literal["scene", "audit"]
    target_id: str
    decision: ApprovalDecision
    reviewer: str
    notes: str
    created_at: datetime
