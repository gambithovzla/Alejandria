from enum import StrEnum


class MemoryKind(StrEnum):
    FACTUAL = "factual"
    DRAMATIC = "dramatic"


class MemoryStatus(StrEnum):
    CANDIDATE = "candidate"
    CONFIRMED = "confirmed"
    RETIRED = "retired"


class SceneStatus(StrEnum):
    BACKLOG = "backlog"
    PLANNED = "planned"
    DRAFTED = "drafted"
    REVIEWING = "reviewing"
    APPROVED = "approved"


class AuditType(StrEnum):
    TECHNICAL = "technical"
    LITERARY = "literary"
    ADVERSARIAL = "adversarial"


class AuditDecision(StrEnum):
    PASS = "pass"
    PASS_WITH_NOTES = "pass_with_notes"
    NEEDS_REVISION = "needs_revision"
    BLOCKED = "blocked"


class NecessityDecision(StrEnum):
    KEEP = "keep"
    REWORK = "rework"
    CUT = "cut"


class ApprovalDecision(StrEnum):
    APPROVE = "approve"
    REQUEST_CHANGES = "request_changes"
    REJECT = "reject"


class PipelineType(StrEnum):
    SCENE_PLANNING = "scene_planning"
    SCENE_WRITING = "scene_writing"
    TECHNICAL_AUDIT = "technical_audit"
    LITERARY_AUDIT = "literary_audit"
    ADVERSARIAL_AUDIT = "adversarial_audit"
