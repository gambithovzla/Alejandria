from __future__ import annotations

from app.domain.enums import ApprovalDecision, AuditDecision, AuditType, NecessityDecision
from app.schemas.scene import SceneWorkflowSnapshot


class WorkflowConflictError(Exception):
    def __init__(self, message: str, blockers: list[str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.blockers = blockers or []


class SceneWorkflowService:
    @classmethod
    def build_snapshot(cls, scene) -> SceneWorkflowSnapshot:
        planning_ready = bool(getattr(scene, "planning_payload", None))
        has_draft = bool((getattr(scene, "draft_markdown", None) or "").strip())
        necessity_payload = getattr(scene, "necessity_assessment", None) or {}
        necessity_decision = necessity_payload.get("decision")
        necessity_passed = necessity_decision == NecessityDecision.KEEP.value

        audit_map = cls._latest_audit_map(getattr(scene, "audits", []) or [])
        technical_audit = audit_map.get(AuditType.TECHNICAL.value)
        literary_audit = audit_map.get(AuditType.LITERARY.value)
        adversarial_audit = audit_map.get(AuditType.ADVERSARIAL.value)

        blockers: list[str] = []
        pending_human_reviews: list[str] = []

        if not planning_ready:
            blockers.append("Run scene planning before writing or auditing the scene.")
        elif necessity_decision == NecessityDecision.REWORK.value:
            blockers.append("Scene Necessity Test returned rework. Adjust the brief and rerun planning.")
        elif necessity_decision == NecessityDecision.CUT.value:
            blockers.append("Scene Necessity Test returned cut. Do not advance this scene without structural changes.")

        if planning_ready and necessity_passed and not has_draft:
            blockers.append("Generate or upload a scene draft before audits and approvals.")

        for audit_type, audit in (
            (AuditType.TECHNICAL.value, technical_audit),
            (AuditType.LITERARY.value, literary_audit),
            (AuditType.ADVERSARIAL.value, adversarial_audit),
        ):
            label = audit_type.replace("_", " ")
            if has_draft and audit is None:
                blockers.append(f"Run the {label} audit.")
            if audit is not None and audit.decision in {AuditDecision.NEEDS_REVISION.value, AuditDecision.BLOCKED.value}:
                blockers.append(f"The {label} audit returned {audit.decision}.")
            if audit is not None and audit.human_review_required:
                approvals = getattr(audit, "approvals", []) or []
                if not approvals:
                    pending_human_reviews.append(f"Human review is still required for the {label} audit.")
                    blockers.append(f"Human review is still required for the {label} audit.")
                elif approvals[0].decision in {ApprovalDecision.REQUEST_CHANGES.value, ApprovalDecision.REJECT.value}:
                    blockers.append(f"The latest human review on the {label} audit did not approve it.")

        scene_approvals = getattr(scene, "approvals", []) or []
        latest_scene_approval = scene_approvals[0].decision if scene_approvals else None
        if latest_scene_approval in {ApprovalDecision.REQUEST_CHANGES.value, ApprovalDecision.REJECT.value}:
            blockers.append("The latest scene-level human approval requested changes or rejected the scene.")

        can_run_writing = planning_ready and necessity_passed
        can_run_technical_audit = planning_ready and has_draft
        can_run_literary_audit = planning_ready and has_draft
        can_run_adversarial_audit = has_draft

        all_audits_exist = technical_audit is not None and literary_audit is not None and adversarial_audit is not None
        no_blocking_audits = all(
            audit is not None and audit.decision not in {AuditDecision.NEEDS_REVISION.value, AuditDecision.BLOCKED.value}
            for audit in (technical_audit, literary_audit, adversarial_audit)
        )
        can_approve_scene = necessity_passed and has_draft and all_audits_exist and no_blocking_audits and not pending_human_reviews

        next_recommended_action = cls._pick_next_action(
            planning_ready=planning_ready,
            necessity_decision=necessity_decision,
            has_draft=has_draft,
            technical_audit=technical_audit,
            literary_audit=literary_audit,
            adversarial_audit=adversarial_audit,
            pending_human_reviews=pending_human_reviews,
            can_approve_scene=can_approve_scene,
            latest_scene_approval=latest_scene_approval,
        )

        return SceneWorkflowSnapshot(
            necessity_passed=necessity_passed,
            can_run_writing=can_run_writing,
            can_run_technical_audit=can_run_technical_audit,
            can_run_literary_audit=can_run_literary_audit,
            can_run_adversarial_audit=can_run_adversarial_audit,
            can_approve_scene=can_approve_scene,
            technical_audit_decision=technical_audit.decision if technical_audit is not None else None,
            literary_audit_decision=literary_audit.decision if literary_audit is not None else None,
            adversarial_audit_decision=adversarial_audit.decision if adversarial_audit is not None else None,
            latest_scene_approval_decision=latest_scene_approval,
            pending_human_reviews=pending_human_reviews,
            blockers=blockers,
            next_recommended_action=next_recommended_action,
        )

    @staticmethod
    def _latest_audit_map(audits: list) -> dict[str, object]:
        audit_map: dict[str, object] = {}
        for audit in sorted(audits, key=lambda item: item.created_at, reverse=True):
            audit_map.setdefault(audit.audit_type, audit)
        return audit_map

    @staticmethod
    def _pick_next_action(
        *,
        planning_ready: bool,
        necessity_decision: str | None,
        has_draft: bool,
        technical_audit,
        literary_audit,
        adversarial_audit,
        pending_human_reviews: list[str],
        can_approve_scene: bool,
        latest_scene_approval: str | None,
    ) -> str:
        if not planning_ready:
            return "Run scene planning."
        if necessity_decision == NecessityDecision.REWORK.value:
            return "Rework the scene brief and rerun planning."
        if necessity_decision == NecessityDecision.CUT.value:
            return "Cut or replace this scene before continuing."
        if not has_draft:
            return "Run scene writing."
        if technical_audit is None:
            return "Run the technical audit."
        if literary_audit is None:
            return "Run the literary audit."
        if adversarial_audit is None:
            return "Run the adversarial audit."
        if pending_human_reviews:
            return "Complete the pending human reviews."
        if can_approve_scene and latest_scene_approval != ApprovalDecision.APPROVE.value:
            return "Approve the scene."
        if latest_scene_approval == ApprovalDecision.APPROVE.value:
            return "Scene approved."
        return "Inspect blockers and revise the scene."
