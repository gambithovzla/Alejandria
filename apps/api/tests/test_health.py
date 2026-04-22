def test_healthcheck(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "llmProviderMode" in payload
    assert "llmAllowMockFallback" in payload


def test_llm_healthcheck(client):
    response = client.get("/api/v1/health/llm")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["mode"] in {"router", "mock", "openai", "anthropic", "kimi"}
    assert "routing" in payload
    assert "scene_planning" in payload["routing"]
