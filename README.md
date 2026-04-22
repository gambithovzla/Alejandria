# NovelEngine

NovelEngine es un estudio editorial asistido por IA para novelas largas. El foco del MVP no es conversar con el usuario, sino sostener un flujo editorial estructurado para planificar, escribir, auditar y revisar escenas con memoria factual y dramática.

## Principios del MVP

- Calidad tecnica y calidad literaria viven en pipelines separados.
- No existe un score unico de aprobacion.
- La escritura automatica trabaja a nivel de escena, no reescribe capitulos completos por defecto.
- Toda salida estructurada pasa por schemas estrictos de Pydantic.
- La revision humana y las aprobaciones quedan registradas.
- Exportar e importar el proyecto debe producir archivos Markdown y JSON legibles.

## Monorepo

```text
NovelEngine/
  apps/
    api/   -> FastAPI, SQLAlchemy, Alembic, tests
    web/   -> Next.js App Router, TypeScript, Tailwind
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
- Integracion LLM: proveedor abstraido con implementacion `mock` para un scaffold testeable

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

1. Crear un proyecto editorial con `style_dna`, `editorial_judgment` y `anti_patterns`.
2. Crear escenas.
3. Ejecutar pipelines con gating minimo de workflow:
   - scene planning
   - scene writing
   - technical audit
   - literary audit
   - adversarial audit
4. Registrar aprobaciones humanas sobre escenas y auditorias.
5. Confirmar o retirar memorias factuales y dramaticas.
6. Consultar timeline de `pipeline_runs` por proyecto.
7. Exportar el proyecto a JSON o Markdown.
8. Reimportar un proyecto exportado en formato JSON.

## Verificacion

- `python -m pytest -p no:cacheprovider apps/api/tests -q` pasa en el backend.
- `npm run build` pasa en el frontend.
- El flujo documentado del backend tambien fue validado dentro de `.venv`.

## Documentacion inicial

- [Estructura del repo](docs/repository-structure.md)
- [Modelo de datos](docs/data-model.md)
- [Decisiones del MVP](docs/decision-log.md)
- [Roadmap por fases](docs/roadmap.md)
