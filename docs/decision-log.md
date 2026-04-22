# Decision log inicial

## 001. Scene-first MVP

Se prioriza escena sobre capitulo porque:

- permite validar el sistema editorial antes de construir jerarquias mas complejas
- evita reescrituras largas no deseadas
- facilita memoria, auditoria y aprobacion incremental

## 002. LLM mock por defecto

El scaffold usa un proveedor `mock` determinista:

- mantiene el proyecto testeable sin depender de red ni credenciales
- fuerza a modelar bien los schemas antes de integrar un proveedor real
- deja una interfaz clara para sustituirlo por OpenAI u otro proveedor despues

## 003. Auditorias separadas

`technical`, `literary` y `adversarial` son reportes independientes:

- no existe score global
- la aprobacion humana decide con contexto, no con una media numerica

## 004. JSON y Markdown como formatos canonicos de export

Se eligen porque:

- son legibles por humanos
- facilitan versionado
- soportan round-trip razonable para MVP

## 005. Workflow derivado, no persistido

El readiness editorial de la escena se calcula en tiempo de lectura:

- evita duplicar estado que ya puede inferirse de escenas, auditorias y aprobaciones
- mantiene el MVP simple
- deja espacio para endurecer reglas sin migraciones innecesarias

## 006. Aprobaciones sobre escenas y auditorias

La revision humana no solo vive al final de la escena:

- algunas auditorias pueden exigir revisiones humanas explicitas
- la aprobacion final de escena queda bloqueada si falta esa revision
- esto preserva la separacion entre criterio tecnico, criterio literario y juicio editorial humano

## 007. Router LLM por tarea con fallback controlado

Se sustituye el mock unico por una estrategia de enrutamiento:

- OpenAI se usa por defecto en planning y auditoria tecnica/adversarial
- Anthropic se usa por defecto en escritura y auditoria literaria
- Kimi queda integrado como proveedor opcional, no como juez editorial por defecto
- `mock` sigue existiendo como fallback explicito para desarrollo local y tests
