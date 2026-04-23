from sqlalchemy import Text

from app.models.scene import Scene


def _create_project(client):
    response = client.post(
        "/api/v1/projects",
        json={
            "title": "La ciudad invertida",
            "premise": "Una restauradora descubre que la novela que traduce esta corrigiendo su memoria.",
            "workType": "novel",
            "structureMode": "scene",
            "genre": "Literary suspense",
            "audience": "Adult crossover",
            "theme": "Identidad y archivo",
            "narrativePov": "Primera persona cercana",
            "tense": "Pasado",
            "targetLengthWords": 95000,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_project_and_scene_pipeline_flow(client):
    project = _create_project(client)
    assert project["workType"] == "novel"
    assert project["structureMode"] == "scene"

    scene_response = client.post(
        f"/api/v1/projects/{project['id']}/scenes",
        json={
            "title": "La sala de catalogo",
            "purpose": "Forzar a Vera a elegir entre proteger el manuscrito o seguir una pista.",
            "brief": "Vera entra al deposito, encuentra una anotacion imposible y debe decidir si ocultarla.",
            "povCharacter": "Vera",
            "location": "el deposito del archivo",
        },
    )
    assert scene_response.status_code == 201
    scene = scene_response.json()

    write_before_plan = client.post(f"/api/v1/scenes/{scene['id']}/write")
    assert write_before_plan.status_code == 409

    plan_response = client.post(f"/api/v1/scenes/{scene['id']}/plan")
    assert plan_response.status_code == 200
    planned_scene = plan_response.json()
    assert planned_scene["planningPayload"]["necessityTest"]["decision"] == "keep"
    assert planned_scene["workflow"]["canRunWriting"] is True

    draft_response = client.post(f"/api/v1/scenes/{scene['id']}/write")
    assert draft_response.status_code == 200
    drafted_scene = draft_response.json()
    assert "## La sala de catalogo" in drafted_scene["draftMarkdown"]

    technical_audit = client.post(f"/api/v1/scenes/{scene['id']}/audits/technical")
    assert technical_audit.status_code == 200
    assert technical_audit.json()["auditType"] == "technical"

    literary_audit = client.post(f"/api/v1/scenes/{scene['id']}/audits/literary")
    assert literary_audit.status_code == 200
    assert literary_audit.json()["auditType"] == "literary"

    adversarial_audit = client.post(f"/api/v1/scenes/{scene['id']}/audits/adversarial")
    assert adversarial_audit.status_code == 200
    assert adversarial_audit.json()["humanReviewRequired"] is True

    approval_blocked = client.post(
        f"/api/v1/approvals/scenes/{scene['id']}",
        json={"decision": "approve", "reviewer": "Editor jefe", "notes": "Intento temprano."},
    )
    assert approval_blocked.status_code == 409

    audit_review = client.post(
        f"/api/v1/approvals/audits/{adversarial_audit.json()['id']}",
        json={"decision": "approve", "reviewer": "Editor de riesgo", "notes": "Riesgo revisado."},
    )
    assert audit_review.status_code == 201
    assert audit_review.json()["targetType"] == "audit"

    approval = client.post(
        f"/api/v1/approvals/scenes/{scene['id']}",
        json={"decision": "approve", "reviewer": "Editor jefe", "notes": "Lista para revision de continuidad global."},
    )
    assert approval.status_code == 201
    assert approval.json()["decision"] == "approve"

    project_detail = client.get(f"/api/v1/projects/{project['id']}")
    assert project_detail.status_code == 200
    detail_payload = project_detail.json()
    scene_payload = detail_payload["scenes"][0]
    assert scene_payload["status"] == "approved"
    assert scene_payload["workflow"]["latestSceneApprovalDecision"] == "approve"

    memory = detail_payload["memories"][0]
    memory_update = client.patch(
        f"/api/v1/projects/{project['id']}/memories/{memory['id']}",
        json={"status": "confirmed", "notes": "Canon confirmado tras revision editorial."},
    )
    assert memory_update.status_code == 200
    assert memory_update.json()["status"] == "confirmed"

    pipeline_runs = client.get(f"/api/v1/projects/{project['id']}/pipeline-runs")
    assert pipeline_runs.status_code == 200
    assert len(pipeline_runs.json()) >= 5
    assert pipeline_runs.json()[0]["inputPayload"]["llm"]["provider"] == "mock"

    book_export = client.get(f"/api/v1/projects/{project['id']}/export/book-markdown")
    assert book_export.status_code == 200
    assert "# La ciudad invertida" in book_export.text
    assert "## La sala de catalogo" in book_export.text


def test_update_project_editorial_profile(client):
    project = _create_project(client)

    response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={
            "title": "Contra el humo",
            "premise": "Un ensayo filosófico sobre claridad, autoridad y autoengaño publico.",
            "workType": "essay",
            "structureMode": "section",
            "genre": "Ensayo filosofico divulgativo",
            "audience": "Lectores de no ficcion",
            "theme": "Claridad intelectual",
            "narrativePov": "Primera persona ensayistica",
            "tense": "Presente",
            "targetLengthWords": 58000,
            "styleDna": {
                "voiceReference": "Prosa sobria, incisiva y sin grandilocuencia.",
                "sentenceProfile": "Frases medianas con cierres cortantes cuando el argumento gana presion.",
                "dialogueProfile": "Si aparece dialogo o cita, que concentre friccion intelectual.",
                "sensoryProfile": "Detalle concreto solo cuando ayuda a pensar mejor.",
                "forbiddenMoves": ["abstractismo hueco", "sentencia inflada"],
            },
            "editorialJudgment": {
                "northStar": "Cada seccion debe afinar la tesis o complicarla de forma productiva.",
                "commercialIntent": "Ensayo legible para publico amplio sin perder rigor.",
                "priorities": ["claridad", "rigor", "progresion"],
                "nonNegotiables": ["sin humo retorico", "sin repeticion de tesis"],
                "riskTolerance": "medium",
            },
            "antiPatterns": [
                {
                    "label": "Tesis inflada",
                    "description": "El texto afirma mas de lo que puede sostener.",
                    "warningSigns": ["afirmacion absoluta", "poca evidencia"],
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Contra el humo"
    assert payload["workType"] == "essay"
    assert payload["structureMode"] == "section"
    assert payload["styleDna"]["voiceReference"] == "Prosa sobria, incisiva y sin grandilocuencia."
    assert payload["editorialJudgment"]["northStar"] == "Cada seccion debe afinar la tesis o complicarla de forma productiva."
    assert payload["antiPatterns"][0]["label"] == "Tesis inflada"


def test_create_section_with_long_context_fields(client):
    project = client.post(
        "/api/v1/projects",
        json={
            "title": "Contra el humo",
            "premise": "Un ensayo sobre claridad, autoridad y autoengaño publico.",
            "workType": "essay",
            "structureMode": "section",
            "genre": "Ensayo filosofico",
            "audience": "Lectores generales",
        },
    ).json()

    response = client.post(
        f"/api/v1/projects/{project['id']}/scenes",
        json={
            "title": "El apagon y la vela",
            "purpose": "Transformar la percepcion del caos en descubrimiento interior.",
            "brief": "El narrador recuerda los apagones y descubre la lectura como refugio y formacion.",
            "povCharacter": "Padre narrador dirigiendose a su hijo en segunda persona para sostener intimidad reflexiva.",
            "location": "El caos como constante en todas las epocas y como las condiciones adversas pueden convertirse en espacios de descubrimiento interior.",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["povCharacter"].startswith("Padre narrador")
    assert payload["location"].startswith("El caos como constante")


def test_scene_context_columns_allow_long_text():
    assert isinstance(Scene.__table__.c.pov_character.type, Text)
    assert isinstance(Scene.__table__.c.location.type, Text)


def test_rewrite_from_audits_creates_a_proposed_version_without_overwriting_current_draft(client):
    project = _create_project(client)
    scene = client.post(
        f"/api/v1/projects/{project['id']}/scenes",
        json={
            "title": "La sala de catalogo",
            "purpose": "Forzar a Vera a elegir entre proteger el manuscrito o seguir una pista.",
            "brief": "Vera entra al deposito, encuentra una anotacion imposible y debe decidir si ocultarla.",
            "povCharacter": "Vera",
            "location": "el deposito del archivo",
        },
    ).json()

    client.post(f"/api/v1/scenes/{scene['id']}/plan")
    draft_response = client.post(f"/api/v1/scenes/{scene['id']}/write")
    original_draft = draft_response.json()["draftMarkdown"]
    client.post(f"/api/v1/scenes/{scene['id']}/audits/literary")

    rewrite_response = client.post(f"/api/v1/scenes/{scene['id']}/rewrite-from-audits")

    assert rewrite_response.status_code == 200
    payload = rewrite_response.json()
    assert payload["draftMarkdown"] == original_draft
    assert len(payload["draftVersions"]) == 2
    assert payload["workflow"]["canRewriteFromAudits"] is True

    active_version = next(version for version in payload["draftVersions"] if version["isActive"])
    proposal_version = next(version for version in payload["draftVersions"] if not version["isActive"])

    assert active_version["sourceType"] == "scene_writing"
    assert proposal_version["sourceType"] == "scene_rewrite_from_audits"
    assert proposal_version["basedOnVersionId"] == active_version["id"]
    assert proposal_version["changeSummary"]
    assert proposal_version["draftMarkdown"] != original_draft


def test_activating_a_rewritten_version_reopens_editorial_flow(client):
    project = _create_project(client)
    scene = client.post(
        f"/api/v1/projects/{project['id']}/scenes",
        json={
            "title": "La sala de catalogo",
            "purpose": "Forzar a Vera a elegir entre proteger el manuscrito o seguir una pista.",
            "brief": "Vera entra al deposito, encuentra una anotacion imposible y debe decidir si ocultarla.",
            "povCharacter": "Vera",
            "location": "el deposito del archivo",
        },
    ).json()

    client.post(f"/api/v1/scenes/{scene['id']}/plan")
    client.post(f"/api/v1/scenes/{scene['id']}/write")
    client.post(f"/api/v1/scenes/{scene['id']}/audits/technical")
    client.post(f"/api/v1/scenes/{scene['id']}/audits/literary")
    adversarial = client.post(f"/api/v1/scenes/{scene['id']}/audits/adversarial").json()
    client.post(
        f"/api/v1/approvals/audits/{adversarial['id']}",
        json={"decision": "approve", "reviewer": "Editor de riesgo", "notes": "Riesgo revisado."},
    )
    approval = client.post(
        f"/api/v1/approvals/scenes/{scene['id']}",
        json={"decision": "approve", "reviewer": "Editor jefe", "notes": "Lista para revision de continuidad global."},
    )
    assert approval.status_code == 201

    rewrite_payload = client.post(f"/api/v1/scenes/{scene['id']}/rewrite-from-audits").json()
    proposal_version = next(version for version in rewrite_payload["draftVersions"] if not version["isActive"])

    activate_response = client.post(f"/api/v1/scenes/{scene['id']}/draft-versions/{proposal_version['id']}/activate")

    assert activate_response.status_code == 200
    payload = activate_response.json()
    assert payload["draftMarkdown"] == proposal_version["draftMarkdown"]
    assert payload["status"] == "drafted"
    assert payload["workflow"]["technicalAuditDecision"] is None
    assert payload["workflow"]["literaryAuditDecision"] is None
    assert payload["workflow"]["adversarialAuditDecision"] is None
    assert payload["workflow"]["latestSceneApprovalDecision"] is None
    assert payload["workflow"]["canApproveScene"] is False
    assert "technical audit" in payload["workflow"]["nextRecommendedAction"].lower()


def test_rerunning_audits_after_activating_a_rewritten_version_unlocks_the_new_version(client):
    project = _create_project(client)
    scene = client.post(
        f"/api/v1/projects/{project['id']}/scenes",
        json={
            "title": "La sala de catalogo",
            "purpose": "Forzar a Vera a elegir entre proteger el manuscrito o seguir una pista.",
            "brief": "Vera entra al deposito, encuentra una anotacion imposible y debe decidir si ocultarla.",
            "povCharacter": "Vera",
            "location": "el deposito del archivo",
        },
    ).json()

    client.post(f"/api/v1/scenes/{scene['id']}/plan")
    client.post(f"/api/v1/scenes/{scene['id']}/write")

    original_technical = client.post(f"/api/v1/scenes/{scene['id']}/audits/technical").json()
    original_literary = client.post(f"/api/v1/scenes/{scene['id']}/audits/literary").json()
    original_adversarial = client.post(f"/api/v1/scenes/{scene['id']}/audits/adversarial").json()
    client.post(
        f"/api/v1/approvals/audits/{original_adversarial['id']}",
        json={"decision": "approve", "reviewer": "Editor de riesgo", "notes": "Riesgo revisado."},
    )

    rewrite_payload = client.post(f"/api/v1/scenes/{scene['id']}/rewrite-from-audits").json()
    proposal_version = next(version for version in rewrite_payload["draftVersions"] if not version["isActive"])

    activate_response = client.post(f"/api/v1/scenes/{scene['id']}/draft-versions/{proposal_version['id']}/activate")
    assert activate_response.status_code == 200

    rerun_technical = client.post(f"/api/v1/scenes/{scene['id']}/audits/technical")
    rerun_literary = client.post(f"/api/v1/scenes/{scene['id']}/audits/literary")
    rerun_adversarial = client.post(f"/api/v1/scenes/{scene['id']}/audits/adversarial")

    assert rerun_technical.status_code == 200
    assert rerun_literary.status_code == 200
    assert rerun_adversarial.status_code == 200

    rerun_technical_payload = rerun_technical.json()
    rerun_literary_payload = rerun_literary.json()
    rerun_adversarial_payload = rerun_adversarial.json()

    assert rerun_technical_payload["id"] != original_technical["id"]
    assert rerun_literary_payload["id"] != original_literary["id"]
    assert rerun_adversarial_payload["id"] != original_adversarial["id"]

    if rerun_adversarial_payload["humanReviewRequired"]:
        audit_review = client.post(
            f"/api/v1/approvals/audits/{rerun_adversarial_payload['id']}",
            json={"decision": "approve", "reviewer": "Editor de riesgo", "notes": "Riesgo revisado de nuevo."},
        )
        assert audit_review.status_code == 201

    project_detail = client.get(f"/api/v1/projects/{project['id']}")
    assert project_detail.status_code == 200
    scene_payload = project_detail.json()["scenes"][0]

    assert scene_payload["workflow"]["technicalAuditDecision"] == rerun_technical_payload["decision"]
    assert scene_payload["workflow"]["literaryAuditDecision"] == rerun_literary_payload["decision"]
    assert scene_payload["workflow"]["adversarialAuditDecision"] == rerun_adversarial_payload["decision"]
    assert scene_payload["workflow"]["canApproveScene"] is True

    approval = client.post(
        f"/api/v1/approvals/scenes/{scene['id']}",
        json={"decision": "approve", "reviewer": "Editor jefe", "notes": "Version revisada lista para cierre."},
    )
    assert approval.status_code == 201


def test_continue_to_next_scene_creates_a_planned_followup_from_an_approved_scene(client):
    project = _create_project(client)
    scene = client.post(
        f"/api/v1/projects/{project['id']}/scenes",
        json={
            "title": "La sala de catalogo",
            "purpose": "Forzar a Vera a elegir entre proteger el manuscrito o seguir una pista.",
            "brief": "Vera entra al deposito, encuentra una anotacion imposible y debe decidir si ocultarla.",
            "povCharacter": "Vera",
            "location": "el deposito del archivo",
        },
    ).json()

    client.post(f"/api/v1/scenes/{scene['id']}/plan")
    client.post(f"/api/v1/scenes/{scene['id']}/write")
    client.post(f"/api/v1/scenes/{scene['id']}/audits/technical")
    client.post(f"/api/v1/scenes/{scene['id']}/audits/literary")
    adversarial = client.post(f"/api/v1/scenes/{scene['id']}/audits/adversarial").json()
    client.post(
        f"/api/v1/approvals/audits/{adversarial['id']}",
        json={"decision": "approve", "reviewer": "Editor de riesgo", "notes": "Riesgo revisado."},
    )
    approval = client.post(
        f"/api/v1/approvals/scenes/{scene['id']}",
        json={"decision": "approve", "reviewer": "Editor jefe", "notes": "Cierra unidad y la vuelve canon."},
    )
    assert approval.status_code == 201

    memory = client.get(f"/api/v1/projects/{project['id']}").json()["memories"][0]
    client.patch(
        f"/api/v1/projects/{project['id']}/memories/{memory['id']}",
        json={"status": "confirmed", "notes": "Canon confirmado para continuidad."},
    )

    continue_response = client.post(
        f"/api/v1/scenes/{scene['id']}/continue",
        json={"includeDraft": False},
    )

    assert continue_response.status_code == 200
    payload = continue_response.json()
    assert payload["sequenceNo"] == 2
    assert payload["status"] == "planned"
    assert payload["planningPayload"] is not None
    assert payload["draftMarkdown"] is None
    assert payload["title"] != scene["title"]
    assert payload["purpose"]
    assert payload["brief"]
    assert payload["workflow"]["canRunWriting"] is True

    pipeline_runs = client.get(f"/api/v1/projects/{project['id']}/pipeline-runs").json()
    assert any(run["pipelineType"] == "scene_continue_to_next" for run in pipeline_runs)


def test_continue_to_next_scene_can_generate_a_first_draft(client):
    project = _create_project(client)
    scene = client.post(
        f"/api/v1/projects/{project['id']}/scenes",
        json={
            "title": "La sala de catalogo",
            "purpose": "Forzar a Vera a elegir entre proteger el manuscrito o seguir una pista.",
            "brief": "Vera entra al deposito, encuentra una anotacion imposible y debe decidir si ocultarla.",
            "povCharacter": "Vera",
            "location": "el deposito del archivo",
        },
    ).json()

    client.post(f"/api/v1/scenes/{scene['id']}/plan")
    client.post(f"/api/v1/scenes/{scene['id']}/write")
    client.post(f"/api/v1/scenes/{scene['id']}/audits/technical")
    client.post(f"/api/v1/scenes/{scene['id']}/audits/literary")
    adversarial = client.post(f"/api/v1/scenes/{scene['id']}/audits/adversarial").json()
    client.post(
        f"/api/v1/approvals/audits/{adversarial['id']}",
        json={"decision": "approve", "reviewer": "Editor de riesgo", "notes": "Riesgo revisado."},
    )
    client.post(
        f"/api/v1/approvals/scenes/{scene['id']}",
        json={"decision": "approve", "reviewer": "Editor jefe", "notes": "Cierra unidad y la vuelve canon."},
    )

    continue_response = client.post(
        f"/api/v1/scenes/{scene['id']}/continue",
        json={"includeDraft": True},
    )

    assert continue_response.status_code == 200
    payload = continue_response.json()
    assert payload["sequenceNo"] == 2
    assert payload["status"] == "drafted"
    assert payload["planningPayload"] is not None
    assert payload["draftMarkdown"]
    assert len(payload["draftVersions"]) == 1
    assert payload["draftVersions"][0]["sourceType"] == "scene_writing"
