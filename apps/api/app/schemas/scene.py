from __future__ import annotations

from pydantic import Field

from app.domain.enums import ApprovalDecision, AuditDecision, NecessityDecision, SceneStatus
from app.schemas.audit import AuditReport
from app.schemas.base import StrictSchemaModel
from app.schemas.draft_version import SceneDraftVersionSummary
from app.schemas.memory import MemoryCandidate


class NecessityAssessment(StrictSchemaModel):
    change_trigger: str
    stakes_if_removed: str
    conflict_contribution: str
    dramatic_shift: str
    decision: NecessityDecision
    rationale: str


class SceneBeat(StrictSchemaModel):
    label: str
    intent: str
    escalation: str


class ScenePlan(StrictSchemaModel):
    logline: str
    goal: str
    conflict: str
    turn: str
    outcome: str
    beats: list[SceneBeat]
    necessity_test: NecessityAssessment
    factual_updates: list[MemoryCandidate] = Field(default_factory=list)
    dramatic_updates: list[MemoryCandidate] = Field(default_factory=list)
    human_review_questions: list[str] = Field(default_factory=list)


class SceneDraft(StrictSchemaModel):
    excerpt_markdown: str
    writer_intent: str
    continuity_notes: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class SceneRewrite(StrictSchemaModel):
    rewritten_excerpt_markdown: str
    change_summary: list[str] = Field(default_factory=list)
    preserved_strengths: list[str] = Field(default_factory=list)
    editorial_rationale: str


class SceneCreate(StrictSchemaModel):
    title: str
    purpose: str
    brief: str
    sequence_no: int | None = None
    chapter_label: str | None = None
    pov_character: str | None = None
    location: str | None = None


class SceneWorkflowSnapshot(StrictSchemaModel):
    necessity_passed: bool
    can_run_planning: bool = True
    can_run_writing: bool
    can_rewrite_from_audits: bool
    can_run_technical_audit: bool
    can_run_literary_audit: bool
    can_run_adversarial_audit: bool
    can_approve_scene: bool
    technical_audit_decision: AuditDecision | None = None
    literary_audit_decision: AuditDecision | None = None
    adversarial_audit_decision: AuditDecision | None = None
    latest_scene_approval_decision: ApprovalDecision | None = None
    pending_human_reviews: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    next_recommended_action: str


class SceneSummary(StrictSchemaModel):
    id: str
    project_id: str
    sequence_no: int
    chapter_label: str | None
    title: str
    purpose: str
    brief: str
    pov_character: str | None
    location: str | None
    status: SceneStatus
    planning_payload: ScenePlan | None = None
    necessity_assessment: NecessityAssessment | None = None
    draft_markdown: str | None = None
    draft_versions: list[SceneDraftVersionSummary] = Field(default_factory=list)
    audits: list[AuditReport] = Field(default_factory=list)
    approvals: list["ApprovalRecord"] = Field(default_factory=list)
    workflow: SceneWorkflowSnapshot | None = None


from app.schemas.approval import ApprovalRecord  # noqa: E402

SceneSummary.model_rebuild()
