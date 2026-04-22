from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.project_structure import build_structure_guidance, unit_label, unit_label_plural
from app.domain.enums import AuditDecision, AuditType, MemoryKind, NecessityDecision, PipelineType, SceneStatus
from app.repositories.audit_repository import AuditRepository
from app.repositories.memory_repository import MemoryRepository
from app.repositories.pipeline_run_repository import PipelineRunRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scene_repository import SceneRepository
from app.schemas.audit import AuditReport
from app.schemas.scene import SceneDraft, ScenePlan
from app.services.scene_workflow_service import SceneWorkflowService, WorkflowConflictError
from app.services.structured_generation import StructuredGenerationService


class PipelineService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.scene_repository = SceneRepository(db)
        self.project_repository = ProjectRepository(db)
        self.memory_repository = MemoryRepository(db)
        self.audit_repository = AuditRepository(db)
        self.pipeline_repository = PipelineRunRepository(db)
        self.generator = StructuredGenerationService()

    def list_runs(self, scene_id: str):
        return self.pipeline_repository.list_for_scene(scene_id)

    def run_scene_planning(self, scene_id: str):
        scene = self.scene_repository.get(scene_id)
        if scene is None:
            return None
        project = self.project_repository.get(scene.project_id)
        assert project is not None
        project_context = self._project_prompt_context(project)

        input_payload = {
            "project": {
                **project_context,
                "premise": project.premise,
                "style_dna": project.style_dna,
                "editorial_judgment": project.editorial_judgment,
                "anti_patterns": project.anti_patterns,
            },
            "scene": {
                "title": scene.title,
                "purpose": scene.purpose,
                "brief": scene.brief,
                "pov_character": scene.pov_character,
                "location": scene.location,
                "sequence_no": scene.sequence_no,
            },
        }
        plan_result = self.generator.generate(ScenePlan, "scene_planning", input_payload)
        plan = plan_result.parsed
        scene.planning_payload = plan.model_dump(mode="json")
        scene.necessity_assessment = plan.necessity_test.model_dump(mode="json")
        scene.status = SceneStatus.PLANNED.value

        self.memory_repository.replace_scene_candidates(project.id, scene.id, MemoryKind.FACTUAL.value, plan.factual_updates)
        self.memory_repository.replace_scene_candidates(project.id, scene.id, MemoryKind.DRAMATIC.value, plan.dramatic_updates)
        self.pipeline_repository.create(
            project_id=project.id,
            scene_id=scene.id,
            pipeline_type=PipelineType.SCENE_PLANNING.value,
            status="completed",
            input_payload={**input_payload, "llm": self._llm_metadata(plan_result)},
            output_payload=plan.model_dump(mode="json"),
        )
        return scene

    def run_scene_writing(self, scene_id: str):
        scene = self.scene_repository.get_detail(scene_id)
        if scene is None:
            return None
        project = self.project_repository.get(scene.project_id)
        assert project is not None
        workflow = scene.workflow
        if not workflow.can_run_writing:
            raise WorkflowConflictError("Scene writing is blocked by the current workflow state.", workflow.blockers)
        project_context = self._project_prompt_context(project)

        input_payload = {
            "project": {
                **project_context,
                "style_dna": project.style_dna,
                "editorial_judgment": project.editorial_judgment,
            },
            "scene": {
                "title": scene.title,
                "purpose": scene.purpose,
                "brief": scene.brief,
                "plan": scene.planning_payload,
                "draft_markdown": scene.draft_markdown,
            },
        }
        draft_result = self.generator.generate(SceneDraft, "scene_writing", input_payload)
        draft = draft_result.parsed
        scene.draft_markdown = draft.excerpt_markdown
        scene.status = SceneStatus.DRAFTED.value
        self.pipeline_repository.create(
            project_id=project.id,
            scene_id=scene.id,
            pipeline_type=PipelineType.SCENE_WRITING.value,
            status="completed",
            input_payload={**input_payload, "llm": self._llm_metadata(draft_result)},
            output_payload=draft.model_dump(mode="json"),
        )
        return scene

    def run_audit(self, scene_id: str, audit_type: AuditType):
        scene = self.scene_repository.get_detail(scene_id)
        if scene is None:
            return None
        project = self.project_repository.get(scene.project_id)
        assert project is not None
        workflow = scene.workflow
        project_context = self._project_prompt_context(project)
        can_run = {
            AuditType.TECHNICAL: workflow.can_run_technical_audit,
            AuditType.LITERARY: workflow.can_run_literary_audit,
            AuditType.ADVERSARIAL: workflow.can_run_adversarial_audit,
        }[audit_type]
        if not can_run:
            raise WorkflowConflictError(f"{audit_type.value} audit is blocked by the current workflow state.", workflow.blockers)

        prompt_name = {
            AuditType.TECHNICAL: "technical_audit",
            AuditType.LITERARY: "literary_audit",
            AuditType.ADVERSARIAL: "adversarial_audit",
        }[audit_type]
        pipeline_type = {
            AuditType.TECHNICAL: PipelineType.TECHNICAL_AUDIT.value,
            AuditType.LITERARY: PipelineType.LITERARY_AUDIT.value,
            AuditType.ADVERSARIAL: PipelineType.ADVERSARIAL_AUDIT.value,
        }[audit_type]
        input_payload = {
            "project": {
                **project_context,
                "style_dna": project.style_dna,
                "editorial_judgment": project.editorial_judgment,
                "anti_patterns": project.anti_patterns,
            },
            "scene": {
                "title": scene.title,
                "purpose": scene.purpose,
                "brief": scene.brief,
                "status": scene.status,
                "planning_payload": scene.planning_payload,
                "necessity_assessment": scene.necessity_assessment,
                "draft_markdown": scene.draft_markdown,
            },
        }
        audit_result = self.generator.generate(AuditReport, prompt_name, input_payload)
        audit = audit_result.parsed
        stored_audit = self.audit_repository.replace_for_scene(scene.id, audit_type, audit)
        scene.status = SceneStatus.REVIEWING.value if audit.decision != AuditDecision.PASS.value else SceneStatus.DRAFTED.value
        self.pipeline_repository.create(
            project_id=project.id,
            scene_id=scene.id,
            pipeline_type=pipeline_type,
            status="completed",
            input_payload={**input_payload, "llm": self._llm_metadata(audit_result)},
            output_payload=audit.model_dump(mode="json"),
        )
        return stored_audit

    @staticmethod
    def _project_prompt_context(project) -> dict[str, str]:
        structure_mode = getattr(project, "structure_mode", None)
        work_type = getattr(project, "work_type", None)
        return {
            "title": project.title,
            "genre": project.genre,
            "audience": project.audience,
            "work_type": work_type or "novel",
            "structure_mode": structure_mode or "scene",
            "unit_label": unit_label(structure_mode),
            "unit_label_plural": unit_label_plural(structure_mode),
            "structure_guidance": build_structure_guidance(work_type, structure_mode),
        }

    @staticmethod
    def _llm_metadata(result) -> dict[str, str | bool | None]:
        usage = None
        if result.usage is not None:
            usage = {
                "input_tokens": result.usage.input_tokens,
                "output_tokens": result.usage.output_tokens,
                "total_tokens": result.usage.total_tokens,
                "cached_input_tokens": result.usage.cached_input_tokens,
                "cache_write_tokens": result.usage.cache_write_tokens,
                "estimated_cost_usd": result.usage.estimated_cost_usd,
                "currency": result.usage.currency,
            }
        return {
            "requested_provider": result.requested_provider,
            "requested_model": result.requested_model,
            "provider": result.provider,
            "model": result.model,
            "usage": usage,
            "fallback_used": result.fallback_used,
            "fallback_reason": result.fallback_reason,
        }
