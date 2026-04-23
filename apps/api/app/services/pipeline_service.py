from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.project_structure import build_structure_guidance, unit_label, unit_label_plural
from app.domain.enums import AuditDecision, AuditType, MemoryKind, NecessityDecision, PipelineType, SceneStatus
from app.models.base import utcnow
from app.repositories.audit_repository import AuditRepository
from app.repositories.memory_repository import MemoryRepository
from app.repositories.pipeline_run_repository import PipelineRunRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scene_draft_version_repository import SceneDraftVersionRepository
from app.repositories.scene_repository import SceneRepository
from app.schemas.audit import AuditReport
from app.schemas.scene import SceneContinuationSuggestion, SceneCreate, SceneDraft, ScenePlan, SceneRewrite
from app.services.scene_workflow_service import SceneWorkflowService, WorkflowConflictError
from app.services.structured_generation import StructuredGenerationService


class PipelineService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.scene_repository = SceneRepository(db)
        self.project_repository = ProjectRepository(db)
        self.memory_repository = MemoryRepository(db)
        self.audit_repository = AuditRepository(db)
        self.draft_version_repository = SceneDraftVersionRepository(db)
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
        current_version = self._ensure_active_draft_version(scene)
        scene.draft_markdown = draft.excerpt_markdown
        scene.status = SceneStatus.DRAFTED.value
        activated_at = utcnow()
        next_version = self.draft_version_repository.create(
            scene_id=scene.id,
            source_type=PipelineType.SCENE_WRITING.value,
            source_label="Draft IA",
            draft_markdown=draft.excerpt_markdown,
            change_summary=[
                f"Nuevo draft generado para la {project_context['unit_label']}.",
            ],
            editorial_rationale=draft.writer_intent,
            based_on_version_id=current_version.id if current_version is not None else None,
        )
        self.draft_version_repository.activate(next_version, activated_at)
        self.pipeline_repository.create(
            project_id=project.id,
            scene_id=scene.id,
            pipeline_type=PipelineType.SCENE_WRITING.value,
            status="completed",
            input_payload={**input_payload, "llm": self._llm_metadata(draft_result)},
            output_payload=draft.model_dump(mode="json"),
        )
        return scene

    def continue_to_next_scene(self, scene_id: str, *, include_draft: bool = False):
        source_scene = self.scene_repository.get_detail(scene_id)
        if source_scene is None:
            return None
        if not source_scene.workflow.can_continue_to_next:
            raise WorkflowConflictError(
                "The current scene is not ready to generate the next unit yet.",
                ["Approve the current unit before asking the system to continue the book."],
            )

        project = self.project_repository.get_detail(source_scene.project_id)
        assert project is not None
        project_context = self._project_prompt_context(project)
        confirmed_memory = self._confirmed_memory_payload(project.id)
        input_payload = {
            "project": {
                **project_context,
                "premise": project.premise,
                "style_dna": project.style_dna,
                "editorial_judgment": project.editorial_judgment,
                "anti_patterns": project.anti_patterns,
                "existing_units": self._existing_units_payload(project.scenes),
            },
            "source_scene": {
                "id": source_scene.id,
                "title": source_scene.title,
                "purpose": source_scene.purpose,
                "brief": source_scene.brief,
                "chapter_label": source_scene.chapter_label,
                "sequence_no": source_scene.sequence_no,
                "pov_character": source_scene.pov_character,
                "location": source_scene.location,
                "planning_payload": source_scene.planning_payload,
                "necessity_assessment": source_scene.necessity_assessment,
                "draft_markdown": source_scene.draft_markdown,
            },
            "confirmed_memory": confirmed_memory,
            "continuation_preferences": {"include_draft": include_draft},
        }
        continuation_result = self.generator.generate(SceneContinuationSuggestion, "scene_continue_to_next", input_payload)
        suggestion = continuation_result.parsed

        created_scene = self.scene_repository.create(
            project_id=project.id,
            payload=SceneCreate(
                title=suggestion.title,
                purpose=suggestion.purpose,
                brief=suggestion.brief,
                chapter_label=suggestion.chapter_label,
                pov_character=suggestion.pov_character,
                location=suggestion.location,
            ),
        )
        self.pipeline_repository.create(
            project_id=project.id,
            scene_id=created_scene.id,
            pipeline_type=PipelineType.SCENE_CONTINUE_TO_NEXT.value,
            status="completed",
            input_payload={**input_payload, "llm": self._llm_metadata(continuation_result)},
            output_payload={**suggestion.model_dump(mode="json"), "source_scene_id": source_scene.id, "include_draft": include_draft},
        )

        planned_scene = self.run_scene_planning(created_scene.id)
        if include_draft:
            return self.run_scene_writing(created_scene.id)
        return planned_scene

    def rewrite_scene_from_audits(self, scene_id: str):
        scene = self.scene_repository.get_detail(scene_id)
        if scene is None:
            return None
        project = self.project_repository.get(scene.project_id)
        assert project is not None
        workflow = scene.workflow
        if not workflow.can_rewrite_from_audits:
            raise WorkflowConflictError("Scene rewrite is blocked by the current workflow state.", workflow.blockers)

        current_version = self._ensure_active_draft_version(scene)
        audit_map = SceneWorkflowService.latest_audit_map_for_current_draft(scene)
        audits = list(audit_map.values())
        if not audits:
            raise WorkflowConflictError("No audit feedback is available for rewrite yet.", ["Run at least one audit before rewriting."])

        project_context = self._project_prompt_context(project)
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
                "pov_character": scene.pov_character,
                "location": scene.location,
            },
            "audits": [AuditReport.model_validate(audit).model_dump(mode="json") for audit in audits],
            "confirmed_memory": self._confirmed_memory_payload(project.id),
        }
        rewrite_result = self.generator.generate(SceneRewrite, "scene_rewrite_from_audits", input_payload)
        rewrite = rewrite_result.parsed
        proposed_version = self.draft_version_repository.create(
            scene_id=scene.id,
            source_type=PipelineType.SCENE_REWRITE_FROM_AUDITS.value,
            source_label=self._rewrite_source_label(audits),
            draft_markdown=rewrite.rewritten_excerpt_markdown,
            change_summary=rewrite.change_summary,
            editorial_rationale=rewrite.editorial_rationale,
            based_on_version_id=current_version.id if current_version is not None else None,
        )
        self.pipeline_repository.create(
            project_id=project.id,
            scene_id=scene.id,
            pipeline_type=PipelineType.SCENE_REWRITE_FROM_AUDITS.value,
            status="completed",
            input_payload={**input_payload, "llm": self._llm_metadata(rewrite_result)},
            output_payload={**rewrite.model_dump(mode="json"), "draft_version_id": proposed_version.id},
        )
        return scene

    def activate_draft_version(self, scene_id: str, version_id: str):
        scene = self.scene_repository.get(scene_id)
        if scene is None:
            return None

        version = self.draft_version_repository.get(version_id)
        if version is None or version.scene_id != scene_id:
            raise ValueError("Draft version not found.")

        activated_at = utcnow()
        self.draft_version_repository.activate(version, activated_at)
        scene.draft_markdown = version.draft_markdown
        scene.status = SceneStatus.DRAFTED.value
        self.db.add(scene)
        self.db.flush()
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
    def _existing_units_payload(scenes) -> list[dict[str, str | int | None]]:
        return [
            {
                "id": scene.id,
                "sequence_no": scene.sequence_no,
                "title": scene.title,
                "purpose": scene.purpose,
                "status": scene.status,
                "latest_approval": getattr(getattr(scene, "workflow", None), "latest_scene_approval_decision", None),
            }
            for scene in sorted(scenes, key=lambda item: item.sequence_no)
        ]

    def _confirmed_memory_payload(self, project_id: str) -> list[dict[str, str | None]]:
        memories = self.memory_repository.list_for_project(project_id)
        confirmed = [memory for memory in memories if memory.status == "confirmed"]
        return [
            {
                "kind": memory.kind,
                "key": memory.key,
                "statement": memory.statement,
                "notes": memory.notes,
            }
            for memory in confirmed
        ]

    def _ensure_active_draft_version(self, scene):
        active = self.draft_version_repository.get_active(scene.id)
        if active is not None:
            return active
        if not scene.draft_markdown:
            return None
        return self.draft_version_repository.create(
            scene_id=scene.id,
            source_type="legacy_snapshot",
            source_label="Draft actual",
            draft_markdown=scene.draft_markdown,
            change_summary=["Snapshot del draft activo antes de introducir versionado editorial."],
            is_active=True,
            activated_at=None,
        )

    @staticmethod
    def _rewrite_source_label(audits) -> str:
        labels = sorted({audit.audit_type.replace("_", " ") for audit in audits})
        if not labels:
            return "Propuesta editorial"
        return f"Reescritura desde {' + '.join(labels)}"

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
