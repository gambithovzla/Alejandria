from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.domain.project_structure import unit_label
from app.domain.enums import AuditDecision, NecessityDecision
from app.services.llm_types import ProviderStructuredResponse


class MockLLMProvider:
    """Deterministic provider for MVP scaffolding and tests."""

    provider_name = "mock"

    def generate_structured(
        self,
        *,
        schema: type[BaseModel],
        prompt_name: str,
        prompt,
        payload: dict[str, Any],
        model: str,
    ) -> ProviderStructuredResponse:
        return ProviderStructuredResponse(output=self.generate(prompt_name, payload))

    def generate(self, prompt_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        scene = payload.get("scene") or payload.get("source_scene") or {}
        project = payload["project"]
        title = scene.get("title", "Unidad")
        purpose = scene.get("purpose", "Mover el proyecto.")
        brief = scene.get("brief", "Brief pendiente.")
        work_type = project.get("work_type", "novel")
        structure_mode = project.get("structure_mode", "scene")
        unit = project.get("unit_label") or unit_label(structure_mode)
        pov = self._default_focus(work_type, scene.get("pov_character"))
        location = self._default_context(work_type, scene.get("location"))
        style = project.get("style_dna", {})

        if prompt_name == "scene_planning":
            brief_is_thin = len(brief.split()) < 12
            decision = NecessityDecision.REWORK.value if brief_is_thin else NecessityDecision.KEEP.value
            conflict = self._conflict_line(work_type, pov, purpose, location)
            return {
                "logline": self._planning_logline(work_type, unit, pov, purpose, location),
                "goal": purpose,
                "conflict": conflict,
                "turn": self._turn_line(work_type, pov),
                "outcome": self._outcome_line(work_type, unit, title),
                "beats": self._beats(work_type, pov),
                "necessity_test": {
                    "change_trigger": f"La {unit} transforma el estado de {pov} frente a '{purpose}'.",
                    "stakes_if_removed": self._stakes_if_removed(work_type, unit),
                    "conflict_contribution": conflict,
                    "dramatic_shift": self._movement_line(work_type, unit),
                    "decision": decision,
                    "rationale": f"La {unit} se mantiene si produce cambio visible; si el brief es demasiado tenue, se marca rework.",
                },
                "factual_updates": [
                    {
                        "key": f"{title.lower().replace(' ', '_')}_fact",
                        "statement": self._factual_update(work_type, pov, location),
                        "notes": "Registrar solo si afecta continuidad o logica causal.",
                    }
                ],
                "dramatic_updates": [
                    {
                        "key": f"{title.lower().replace(' ', '_')}_pressure",
                        "statement": self._dramatic_update(work_type, unit, pov, purpose),
                        "notes": "Usar para sostener la curva editorial de unidades siguientes.",
                    }
                ],
                "human_review_questions": [
                    f"La {unit} cambia algo de forma verificable?",
                    "El conflicto o la friccion realmente mueve el proyecto?",
                    f"La necesidad de la {unit} sigue siendo defendible sin explicacion externa?",
                ],
            }

        if prompt_name == "scene_writing":
            plan = scene.get("plan") or {}
            logline = plan.get("logline", f"{pov} afronta una {unit} con presion creciente.")
            voice_reference = style.get("voice_reference", "prosa sobria")
            return {
                "excerpt_markdown": (
                    f"## {title}\n\n"
                    f"{self._writing_opening(work_type, location, pov, purpose)} "
                    f"{logline} La prosa busca {voice_reference.lower()} y deja el movimiento principal en primer plano.\n\n"
                    f"{self._writing_turn(work_type, unit, pov)}"
                ),
                "writer_intent": f"Entregar un borrador de {unit} enfocado en progresion, presion y cambio visible sin reescribir el libro completo.",
                "continuity_notes": [
                    "Verificar que el draft no contradiga memoria factual confirmada.",
                    "Revisar continuidad del tono con style_dna.",
                ],
                "open_questions": [
                    "Hace falta mas resistencia externa en el segundo beat?",
                    f"El cierre de la {unit} deja suficiente arrastre para la siguiente unidad?",
                ],
            }

        if prompt_name == "scene_rewrite_from_audits":
            current_draft = scene.get("draft_markdown") or ""
            audit_labels = [item.get("audit_type", "audit") for item in payload.get("audits", [])]
            memory_count = len(payload.get("confirmed_memory", []))
            revision_focus = ", ".join(audit_labels) if audit_labels else "editorial"
            rewritten = current_draft or f"## {title}\n\nBorrador base de la {unit}."
            rewritten += (
                "\n\n### Revision propuesta\n\n"
                f"Esta version aprieta la {unit} segun las observaciones de {revision_focus}, elimina explicacion redundante y sostiene mejor el hilo canonico con {memory_count} memorias confirmadas."
            )
            return {
                "rewritten_excerpt_markdown": rewritten,
                "change_summary": [
                    f"Se comprimio la explicacion para que la {unit} avance con mas precision.",
                    f"Se reforzo la continuidad con memorias confirmadas y con el plan activo de la {unit}.",
                    "Se preservo la voz central mientras se limpiaron zonas blandas o repetitivas.",
                ],
                "preserved_strengths": [
                    "La voz original del borrador actual.",
                    "El movimiento principal definido por el plan.",
                ],
                "editorial_rationale": f"La propuesta de rewrite responde a {revision_focus} sin reemplazar de forma silenciosa el texto base.",
            }

        if prompt_name == "scene_continue_to_next":
            source_sequence = int(scene.get("sequence_no") or 0)
            next_sequence = source_sequence + 1 if source_sequence > 0 else len(project.get("existing_units", [])) + 1
            source_title = scene.get("title") or f"{unit.capitalize()} previa"
            confirmed_memory = payload.get("confirmed_memory", [])
            continuity_key = confirmed_memory[0]["statement"] if confirmed_memory else f"la consecuencia directa de {source_title}"
            return {
                "title": self._next_unit_title(work_type, unit, next_sequence, source_title),
                "purpose": self._next_unit_purpose(work_type, unit, source_title),
                "brief": self._next_unit_brief(work_type, unit, source_title, continuity_key),
                "chapter_label": scene.get("chapter_label"),
                "pov_character": pov,
                "location": self._next_unit_context(work_type, location, continuity_key),
                "rationale": f"La siguiente {unit} prolonga la consecuencia de {source_title} y reutiliza memoria confirmada para no romper el canon del proyecto.",
            }

        if prompt_name == "technical_audit":
            findings = []
            if not scene.get("planning_payload"):
                findings.append(
                    {
                        "area": "planning",
                        "severity": "critical",
                        "issue": f"La {unit} no tiene plan validado.",
                        "evidence": "planning_payload esta vacio.",
                        "recommended_action": f"Ejecutar planning de la {unit} antes de seguir.",
                        "requires_human_review": False,
                    }
                )
            if not scene.get("draft_markdown"):
                findings.append(
                    {
                        "area": "draft",
                        "severity": "warning",
                        "issue": f"No existe draft para auditar continuidad fina de la {unit}.",
                        "evidence": "draft_markdown esta vacio.",
                        "recommended_action": f"Generar o cargar un draft de la {unit}.",
                        "requires_human_review": False,
                    }
                )
            necessity = scene.get("necessity_assessment") or {}
            if necessity.get("decision") == NecessityDecision.REWORK.value:
                findings.append(
                    {
                        "area": "scene_necessity",
                        "severity": "warning",
                        "issue": f"La {unit} requiere rework segun su propio Necessity Test.",
                        "evidence": necessity.get("rationale", "Sin racional detallado."),
                        "recommended_action": "Ajustar el brief o el giro para que el cambio sea inequivoco.",
                        "requires_human_review": True,
                    }
                )

            decision = AuditDecision.PASS.value if not findings else AuditDecision.NEEDS_REVISION.value
            return {
                "audit_type": "technical",
                "decision": decision,
                "summary": f"Revisa continuidad, causalidad, dependencia del plan y necesidad estructural de la {unit}.",
                "findings": findings,
                "next_steps": [
                    f"Corregir huecos de continuidad antes de promover la {unit}.",
                    "No usar esta auditoria como sustituto del juicio literario.",
                ],
                "human_review_required": any(item["requires_human_review"] for item in findings),
            }

        if prompt_name == "literary_audit":
            findings = []
            draft = scene.get("draft_markdown") or ""
            if len(draft.split()) < 40:
                findings.append(
                    {
                        "area": "density",
                        "severity": "warning",
                        "issue": "El draft todavia tiene poca densidad editorial.",
                        "evidence": "El texto es muy corto para sostener respiracion propia.",
                        "recommended_action": f"Expandir el momento de mayor presion sin salir del alcance de la {unit}.",
                        "requires_human_review": False,
                    }
                )
            if not project.get("style_dna", {}).get("voice_reference"):
                findings.append(
                    {
                        "area": "voice",
                        "severity": "warning",
                        "issue": "No hay referencia clara de voz editorial.",
                        "evidence": "style_dna.voice_reference esta vacio.",
                        "recommended_action": "Completar style_dna antes de una revision de estilo mas severa.",
                        "requires_human_review": True,
                    }
                )

            decision = AuditDecision.PASS_WITH_NOTES.value if findings else AuditDecision.PASS.value
            return {
                "audit_type": "literary",
                "decision": decision,
                "summary": "Examina voz, ritmo, potencia expresiva y movimiento de la unidad sin confundirlo con consistencia tecnica.",
                "findings": findings,
                "next_steps": [
                    "Revisar si el ritmo deja un antes y un despues claro.",
                    f"Comprobar que la {unit} no explique lo que deberia mostrar, argumentar o revelar.",
                ],
                "human_review_required": any(item["requires_human_review"] for item in findings),
            }

        if prompt_name == "adversarial_audit":
            anti_patterns = [item.get("label", "").lower() for item in project.get("anti_patterns", [])]
            risk = "conveniencia de trama" in anti_patterns
            findings = []
            if risk:
                findings.append(
                    {
                        "area": "anti_patterns",
                        "severity": "warning",
                        "issue": "Existe riesgo de resolver la unidad con una solucion demasiado facil.",
                        "evidence": "El anti_pattern fue declarado en la configuracion editorial.",
                        "recommended_action": "Forzar costo, friccion y perdida visible en la resolucion.",
                        "requires_human_review": True,
                    }
                )
            return {
                "audit_type": "adversarial",
                "decision": AuditDecision.PASS_WITH_NOTES.value if findings else AuditDecision.PASS.value,
                "summary": "Busca debilidades explotables: conveniencias, cliches, autoindulgencias o razonamiento blando.",
                "findings": findings,
                "next_steps": [
                    "Usar esta auditoria como red team editorial, no como juez unico.",
                ],
                "human_review_required": any(item["requires_human_review"] for item in findings),
            }

        raise ValueError(f"Unsupported prompt: {prompt_name}")

    @staticmethod
    def _default_focus(work_type: str, value: str | None) -> str:
        if value:
            return value
        if work_type == "essay":
            return "la voz ensayistica"
        if work_type == "practical":
            return "la voz guia"
        if work_type in {"biography", "memoir", "narrative_nonfiction"}:
            return "la figura central"
        return "la protagonista"

    @staticmethod
    def _default_context(work_type: str, value: str | None) -> str:
        if value:
            return value
        if work_type == "essay":
            return "el marco argumental"
        if work_type == "practical":
            return "el problema operativo"
        if work_type in {"biography", "memoir", "narrative_nonfiction"}:
            return "el contexto real en presion"
        return "un espacio de presion"

    @staticmethod
    def _conflict_line(work_type: str, pov: str, purpose: str, location: str) -> str:
        if work_type == "essay":
            return f"{pov} persigue {purpose.lower()} mientras una objecion fuerte dentro de {location} empuja en contra."
        if work_type == "practical":
            return f"{pov} intenta {purpose.lower()} mientras una limitacion real en {location} vuelve mas costosa la promesa."
        return f"{pov} persigue {purpose.lower()} mientras el entorno en {location} empuja en contra."

    @staticmethod
    def _planning_logline(work_type: str, unit: str, pov: str, purpose: str, location: str) -> str:
        if work_type == "essay":
            return f"{pov} entra en {location} para sostener {purpose.lower()} y sale con una tesis mas precisa y mas exigente."
        if work_type == "practical":
            return f"{pov} usa {location} para aterrizar {purpose.lower()} y deja un metodo mas claro pero mas exigente."
        return f"{pov} entra en {location} para {purpose.lower()} y sale con una presion nueva en la {unit}."

    @staticmethod
    def _turn_line(work_type: str, pov: str) -> str:
        if work_type == "essay":
            return f"El desarrollo de {pov} encuentra una objecion que obliga a afinar la tesis en lugar de repetirla."
        if work_type == "practical":
            return f"El intento de {pov} revela una friccion aplicable que corrige la solucion demasiado facil."
        return f"El intento de {pov} revela un costo inesperado ligado a la premisa del proyecto."

    @staticmethod
    def _outcome_line(work_type: str, unit: str, title: str) -> str:
        if work_type == "essay":
            return f"La {unit} deja una pregunta mas fina y una posicion mas defendible para la siguiente unidad de {title}."
        if work_type == "practical":
            return f"La {unit} deja un aprendizaje operativo listo para ampliarse en la siguiente unidad de {title}."
        return f"La {unit} deja una nueva condicion dramatica para la siguiente secuencia de {title}."

    @staticmethod
    def _beats(work_type: str, pov: str) -> list[dict[str, str]]:
        if work_type == "essay":
            return [
                {
                    "label": "pregunta",
                    "intent": f"Situar a {pov} ante una pregunta concreta.",
                    "escalation": "La primera formulacion de la idea resulta insuficiente.",
                },
                {
                    "label": "friccion",
                    "intent": "Introducir la objecion o tension central.",
                    "escalation": "La idea tiene que probarse contra resistencia real.",
                },
                {
                    "label": "sintesis",
                    "intent": "Cerrar con una version mas precisa y util.",
                    "escalation": "La respuesta final abre una exigencia nueva para la siguiente unidad.",
                },
            ]
        if work_type == "practical":
            return [
                {
                    "label": "problema",
                    "intent": f"Delimitar lo que {pov} quiere resolver.",
                    "escalation": "La solucion obvia demuestra ser incompleta.",
                },
                {
                    "label": "friccion",
                    "intent": "Mostrar el costo o la restriccion real.",
                    "escalation": "La aplicacion exige una decision mas concreta.",
                },
                {
                    "label": "metodo",
                    "intent": "Cerrar con una accion aplicable.",
                    "escalation": "El metodo deja una siguiente capa de complejidad.",
                },
            ]
        return [
            {
                "label": "entrada",
                "intent": f"Situar a {pov} con un objetivo concreto.",
                "escalation": "La informacion inicial no alcanza para actuar con seguridad.",
            },
            {
                "label": "presion",
                "intent": "Forzar una eleccion visible.",
                "escalation": "El conflicto externo activa una contradiccion interna.",
            },
            {
                "label": "giro",
                "intent": "Mover la historia a una posicion distinta.",
                "escalation": "La unidad termina peor, mas cara o mas urgente que como empezo.",
            },
        ]

    @staticmethod
    def _stakes_if_removed(work_type: str, unit: str) -> str:
        if work_type == "essay":
            return f"Se perderia un paso del razonamiento y la progresion intelectual de la {unit} quedaria hueca."
        if work_type == "practical":
            return f"Se perderia un paso operativo y la promesa util de la {unit} quedaria incompleta."
        return f"Se perderia una pieza de continuidad y la progresion emocional de la {unit} quedaria hueca."

    @staticmethod
    def _movement_line(work_type: str, unit: str) -> str:
        if work_type == "essay":
            return f"La {unit} convierte una intuicion en una posicion mas precisa y mas dificil."
        if work_type == "practical":
            return f"La {unit} convierte una intencion en una accion aplicable con friccion real."
        return f"La {unit} convierte una intencion en una carga concreta."

    @staticmethod
    def _factual_update(work_type: str, pov: str, location: str) -> str:
        if work_type == "essay":
            return f"{pov} fija un marco conceptual reutilizable dentro de {location}."
        if work_type == "practical":
            return f"{pov} aterriza un criterio operativo relevante dentro de {location}."
        return f"{pov} descubre un dato operativo relevante en {location}."

    @staticmethod
    def _dramatic_update(work_type: str, unit: str, pov: str, purpose: str) -> str:
        if work_type == "essay":
            return f"La tension intelectual de {pov} aumenta tras intentar {purpose.lower()} en la {unit}."
        if work_type == "practical":
            return f"La presion aplicada de {pov} aumenta tras intentar {purpose.lower()} en la {unit}."
        return f"La presion emocional de {pov} aumenta tras perseguir {purpose.lower()} en la {unit}."

    @staticmethod
    def _writing_opening(work_type: str, location: str, pov: str, purpose: str) -> str:
        if work_type == "essay":
            return f"{pov} entra en {location} con una pregunta concreta: {purpose.lower()}."
        if work_type == "practical":
            return f"{pov} parte de {location} con una tarea concreta: {purpose.lower()}."
        return f"{pov} entro en {location} con una idea simple: {purpose.lower()}."

    @staticmethod
    def _writing_turn(work_type: str, unit: str, pov: str) -> str:
        if work_type == "essay":
            return f"Cuando aparecio la objecion fuerte, la {unit} dejo de explicar y empezo a demostrar. {pov} entendio que la idea solo valia si soportaba friccion real."
        if work_type == "practical":
            return f"Cuando aparecio la limitacion real, la {unit} dejo de prometer y empezo a operar. {pov} entendio que el metodo solo servia si soportaba costo, contexto y secuencia."
        return f"Cuando llego el giro, lo que parecia una ventaja se volvio costo. {pov} entendio que la {unit} no estaba ahi para explicar el mundo, sino para desplazarlo."

    @staticmethod
    def _next_unit_title(work_type: str, unit: str, next_sequence: int, source_title: str) -> str:
        if work_type == "essay":
            return f"Lo que {source_title.lower()} obliga a pensar"
        if work_type == "practical":
            return f"Aplicar la leccion {next_sequence}"
        return f"{source_title}: consecuencia {next_sequence}"

    @staticmethod
    def _next_unit_purpose(work_type: str, unit: str, source_title: str) -> str:
        if work_type == "essay":
            return f"Llevar la tesis abierta en {source_title} hacia una objecion mas dificil y mas productiva."
        if work_type == "practical":
            return f"Convertir lo abierto en {source_title} en una decision aplicable con costo real."
        return f"Desplegar la consecuencia directa de {source_title} y subir la presion de la historia."

    @staticmethod
    def _next_unit_brief(work_type: str, unit: str, source_title: str, continuity_key: str) -> str:
        if work_type == "essay":
            return f"La nueva {unit} toma el hallazgo de {source_title}, lo pone contra una objecion fuerte y usa {continuity_key} para volver la tesis mas precisa."
        if work_type == "practical":
            return f"La nueva {unit} parte de {source_title}, prueba el metodo bajo restriccion y usa {continuity_key} para evitar una solucion cosmetica."
        return f"La nueva {unit} arranca con la secuela inmediata de {source_title}, incorpora {continuity_key} y obliga a una decision mas costosa."

    @staticmethod
    def _next_unit_context(work_type: str, location: str, continuity_key: str) -> str:
        if work_type == "essay":
            return f"Un debate mas tenso dentro de {location}, sostenido por {continuity_key}"
        if work_type == "practical":
            return f"Un caso mas exigente dentro de {location}, con {continuity_key}"
        return f"Una version mas inestable de {location}, atravesada por {continuity_key}"
