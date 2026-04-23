# NovelEngine

NovelEngine es un estudio editorial asistido por IA para libros largos. El foco del MVP no es conversar con el usuario, sino sostener un flujo editorial estructurado para planificar, escribir, auditar y revisar unidades de trabajo con memoria factual y dramatica.

## Principios del MVP

- Calidad tecnica y calidad literaria viven en pipelines separados.
- No existe un score unico de aprobacion.
- La escritura automatica trabaja a nivel de unidad, no reescribe capitulos completos por defecto.
- Toda salida estructurada pasa por schemas estrictos de Pydantic.
- La revision humana y las aprobaciones quedan registradas.
- Exportar e importar el proyecto debe producir archivos Markdown y JSON legibles.

## Monorepo

```text
NovelEngine/
  apps/
    api/   -> FastAPI, SQLAlchemy, Alembic, tests
    web/   -> Next.js App Router, React, TypeScript, Tailwind
  packages/
    contracts/ -> Tipos compartidos para el frontend
  docs/
    repository-structure.md
    data-model.md
    decision-log.md
    roadmap.md
```

## Stack

- Backend: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy, PostgreSQL, Alembic
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Persistencia: PostgreSQL en produccion; SQLite soportado en tests
- Integracion LLM: router por tarea con OpenAI, Anthropic, Kimi y fallback `mock` para desarrollo y tests

## Arranque rapido

### 1. Variables de entorno

```bash
cp .env.example .env
```

### 2. Frontend

```bash
npm install
npm run build
```

### 3. Backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e apps/api[dev]
alembic -c apps/api/alembic.ini upgrade head
pytest apps/api/tests
uvicorn app.main:app --app-dir apps/api --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend en desarrollo

```bash
npm run dev:web
```

## Estado actual

Este scaffold deja operativo el flujo MVP:

1. Crear un proyecto editorial con `work_type`, `structure_mode`, `style_dna`, `editorial_judgment` y `anti_patterns`.
2. Crear unidades de trabajo scene-first reinterpretables como escenas, secciones, episodios o modulos.
3. Ejecutar pipelines con gating minimo de workflow:
   - scene planning
   - scene writing
   - scene rewrite from audits
   - scene continue to next
   - technical audit
   - literary audit
   - adversarial audit
4. Registrar aprobaciones humanas sobre unidades y auditorias.
5. Confirmar o retirar memorias factuales y dramaticas.
6. Consultar timeline de `pipeline_runs` por proyecto.
7. Exportar el proyecto a JSON o Markdown.
8. Reimportar un proyecto exportado en formato JSON.
9. Editar la carta editorial del proyecto desde la UI y `PATCH /api/v1/projects/{id}`.

## Estrategia LLM recomendada

La configuracion por defecto ya deja cableada una ruta editorial razonable:

- `scene_planning` -> `openai:gpt-5.4-mini`
- `scene_writing` -> `anthropic:claude-sonnet-4-6`
- `scene_rewrite_from_audits` -> `anthropic:claude-sonnet-4-6`
- `scene_continue_to_next` -> `openai:gpt-5.4-mini`
- `technical_audit` -> `openai:gpt-5.4`
- `literary_audit` -> `anthropic:claude-opus-4-7`
- `adversarial_audit` -> `openai:gpt-5.4`
- `kimi:kimi-k2.6` queda integrado como proveedor opcional y experimental

Si faltan credenciales, el backend puede caer a `mock` con `NOVEL_ENGINE_LLM_ALLOW_MOCK_FALLBACK=true`.

Endpoints utiles:

- `GET /api/v1/health`
- `GET /api/v1/health/llm`
- `PATCH /api/v1/projects/{id}`

## Verificacion

- `python -m pytest -p no:cacheprovider apps/api/tests -q`
- `npm run build`

## Documentacion inicial

- [Estructura del repo](docs/repository-structure.md)
- [Modelo de datos](docs/data-model.md)
- [Decisiones del MVP](docs/decision-log.md)
- [Roadmap por fases](docs/roadmap.md)
- [Estrategia LLM](docs/llm-strategy.md)
