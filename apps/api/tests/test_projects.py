def _create_project(client):
    response = client.post(
        "/api/v1/projects",
        json={
            "title": "La ciudad invertida",
            "premise": "Una restauradora descubre que la novela que traduce esta corrigiendo su memoria.",
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
