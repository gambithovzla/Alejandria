# Estructura propuesta del repo

## Objetivo

Separar con claridad:

- dominio editorial
- infraestructura tecnica
- contratos de API
- interfaz de trabajo

Sin caer en sobreingenieria de microservicios o paquetes innecesarios.

## Estructura final del MVP

```text
NovelEngine/
  apps/
    api/
      app/
        api/            # routers HTTP y dependencias FastAPI
        core/           # configuracion y wiring
        db/             # sesion y metadata
        domain/         # enums y reglas de negocio estables
        models/         # modelos ORM
        repositories/   # acceso a datos
        schemas/        # DTOs y schemas estrictos
        services/       # casos de uso y pipelines
      alembic/
      tests/
    web/
      src/app/          # rutas Next.js
      src/components/   # UI reutilizable
      src/lib/          # cliente API y helpers
  packages/
    contracts/          # tipos TS compartidos
  docs/
```

## Criterios de esta estructura

- `apps/api` contiene el dominio operativo del producto.
- `services/` orquesta reglas y persistencia, evitando meter logica compleja en routers.
- `schemas/` concentra los contratos estrictos para entradas, salidas y respuestas del LLM.
- `packages/contracts` permite que el frontend comparta nomenclatura de estados y payloads sin acoplarse a Pydantic.
- El dominio se mantiene scene-first, porque el MVP quiere demostrar memoria, auditoria y aprobacion escena por escena antes de escalar a arcos mas complejos.
