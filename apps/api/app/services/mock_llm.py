from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.domain.enums import AuditDecision, NecessityDecision


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
    ) -> dict[str, Any]:
        return self.generate(prompt_name, payload)

    def generate(self, prompt_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        scene = payload["scene"]
        project = payload["project"]
        title = scene["title"]
        purpose = scene["purpose"]
        brief = scene["brief"]
        pov = scene.get("pov_character") or "la protagonista"
        location = scene.get("location") or "un espacio de presion"
        style = project.get("style_dna", {})

        if prompt_name == "scene_planning":
            brief_is_thin = len(brief.split()) < 12
            decision = NecessityDecision.REWORK.value if brief_is_thin else NecessityDecision.KEEP.value
            conflict = f"{pov} persigue {purpose.lower()} mientras el entorno en {location} empuja en contra."
            return {
                "logline": f"{pov} entra en {location} para {purpose.lower()} y sale con una presion nueva.",
                "goal": purpose,
                "conflict": conflict,
                "turn": f"El intento de {pov} revela un costo inesperado ligado a la premisa del proyecto.",
                "outcome": f"La escena deja una nueva condicion dramatica para la siguiente secuencia de {title}.",
                "beats": [
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
                        "escalation": "La escena termina peor, mas cara o mas urgente que como empezo.",
                    },
                ],
                "necessity_test": {
                    "change_trigger": f"La escena transforma el estado de {pov} frente a '{purpose}'.",
                    "stakes_if_removed": "Se perderia una pieza de continuidad y la progresion emocional quedaria hueca.",
                    "conflict_contribution": conflict,
                    "dramatic_shift": "La escena convierte una intencion en una carga concreta.",
                    "decision": decision,
                    "rationale": "La escena se mantiene si produce cambio visible; si el brief es demasiado tenue, se marca rework.",
                },
                "factual_updates": [
                    {
                        "key": f"{title.lower().replace(' ', '_')}_fact",
                        "statement": f"{pov} descubre un dato operativo relevante en {location}.",
                        "notes": "Registrar solo si afecta continuidad o logica causal.",
                    }
                ],
                "dramatic_updates": [
                    {
                        "key": f"{title.lower().replace(' ', '_')}_pressure",
                        "statement": f"La presion emocional de {pov} aumenta tras perseguir {purpose.lower()}.",
                        "notes": "Usar para sostener la curva dramatica de escenas siguientes.",
                    }
                ],
                "human_review_questions": [
                    "La escena cambia algo de forma verificable?",
                    "El conflicto escala o solo informa?",
                    "La necesidad de la escena sigue siendo defendible sin explicacion externa?",
                ],
            }

        if prompt_name == "scene_writing":
            plan = scene.get("plan") or {}
            logline = plan.get("logline", f"{pov} afronta una escena con presion creciente.")
            voice_reference = style.get("voice_reference", "prosa sobria")
            return {
                "excerpt_markdown": (
                    f"## {title}\n\n"
                    f"{pov} entro en {location} con una idea simple: {purpose.lower()}. "
                    f"Pero la escena no le concedio la comodidad de una linea recta. "
                    f"{logline} La prosa busca {voice_reference.lower()} y deja el golpe emocional en el subtexto.\n\n"
                    f"Cuando llego el giro, lo que parecia una ventaja se volvio costo. "
                    f"{pov} entendio que la escena no estaba ahi para explicar el mundo, sino para desplazarlo."
                ),
                "writer_intent": "Entregar un borrador de escena enfocado en objetivo, presion y cambio visible sin reescribir un capitulo completo.",
                "continuity_notes": [
                    "Verificar que el draft no contradiga memoria factual confirmada.",
                    "Revisar continuidad del tono con style_dna.",
                ],
                "open_questions": [
                    "Hace falta mas resistencia externa en el segundo beat?",
                    "El cierre de la escena deja suficiente arrastre para la siguiente unidad?",
                ],
            }

        if prompt_name == "technical_audit":
            findings = []
            if not scene.get("planning_payload"):
                findings.append(
                    {
                        "area": "planning",
                        "severity": "critical",
                        "issue": "La escena no tiene plan validado.",
                        "evidence": "planning_payload esta vacio.",
                        "recommended_action": "Ejecutar scene planning antes de seguir.",
                        "requires_human_review": False,
                    }
                )
            if not scene.get("draft_markdown"):
                findings.append(
                    {
                        "area": "draft",
                        "severity": "warning",
                        "issue": "No existe draft para auditar continuidad fina.",
                        "evidence": "draft_markdown esta vacio.",
                        "recommended_action": "Generar o cargar un draft de escena.",
                        "requires_human_review": False,
                    }
                )
            necessity = scene.get("necessity_assessment") or {}
            if necessity.get("decision") == NecessityDecision.REWORK.value:
                findings.append(
                    {
                        "area": "scene_necessity",
                        "severity": "warning",
                        "issue": "La escena requiere rework segun su propio Scene Necessity Test.",
                        "evidence": necessity.get("rationale", "Sin racional detallado."),
                        "recommended_action": "Ajustar el brief o el giro para que el cambio sea inequívoco.",
                        "requires_human_review": True,
                    }
                )

            decision = AuditDecision.PASS.value if not findings else AuditDecision.NEEDS_REVISION.value
            return {
                "audit_type": "technical",
                "decision": decision,
                "summary": "Revisa continuidad, causalidad, dependencia del plan y necesidad estructural de la escena.",
                "findings": findings,
                "next_steps": [
                    "Corregir huecos de continuidad antes de promover la escena.",
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
                        "issue": "El draft todavia tiene poca densidad dramatica.",
                        "evidence": "El texto es muy corto para sostener respiracion narrativa.",
                        "recommended_action": "Expandir el momento de presion y el giro sin salir del alcance de la escena.",
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
                "summary": "Examina tension, voz, subtexto y potencia emocional sin confundirlo con consistencia tecnica.",
                "findings": findings,
                "next_steps": [
                    "Revisar si el ritmo deja un antes y un despues emocional.",
                    "Comprobar que la escena no explique lo que deberia dramatizar.",
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
                        "issue": "Existe riesgo de resolver la escena con conveniencia de trama.",
                        "evidence": "El anti_pattern fue declarado en la configuracion editorial.",
                        "recommended_action": "Forzar costo, friccion y perdida visible en la resolucion.",
                        "requires_human_review": True,
                    }
                )
            return {
                "audit_type": "adversarial",
                "decision": AuditDecision.PASS_WITH_NOTES.value if findings else AuditDecision.PASS.value,
                "summary": "Busca debilidades explotables: conveniencias, cliches y autoindulgencias del borrador.",
                "findings": findings,
                "next_steps": [
                    "Usar esta auditoria como red team editorial, no como juez unico.",
                ],
                "human_review_required": any(item["requires_human_review"] for item in findings),
            }

        raise ValueError(f"Unsupported prompt: {prompt_name}")
