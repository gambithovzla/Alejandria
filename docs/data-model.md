# Modelo de datos MVP

## Principios

- El proyecto es la unidad editorial principal.
- La escena sigue siendo la unidad operativa interna del MVP, pero puede reinterpretarse como seccion, episodio o modulo segun `work_type` y `structure_mode`.
- La memoria se separa en factual y dramatica.
- Las auditorias no colapsan en una puntuacion unica.
- Los pipelines generan artefactos persistentes y auditables.

## Entidades

### `projects`

Contiene identidad editorial y configuracion creativa:

- `title`
- `premise`
- `work_type`
- `structure_mode`
- `genre`
- `audience`
- `theme`
- `narrative_pov`
- `tense`
- `target_length_words`
- `style_dna` JSON
- `editorial_judgment` JSON
- `anti_patterns` JSON

### `scenes`

Unidad minima de trabajo scene-first, reinterpretada en UI y prompting segun el tipo de libro:

- `project_id`
- `sequence_no`
- `chapter_label`
- `title`
- `purpose`
- `brief`
- `pov_character`
- `location`
- `status`
- `planning_payload` JSON
- `necessity_assessment` JSON
- `draft_markdown`

### `project_memories`

Memoria estructurada por proyecto:

- `kind`: `factual` | `dramatic`
- `key`
- `statement`
- `status`: `candidate` | `confirmed` | `retired`
- `source_scene_id`
- `notes`

### `audits`

Resultado de cada auditoria especializada:

- `scene_id`
- `audit_type`: `technical` | `literary` | `adversarial`
- `decision`: `pass` | `pass_with_notes` | `needs_revision` | `blocked`
- `summary`
- `findings` JSON
- `next_steps` JSON
- `human_review_required`

### `pipeline_runs`

Trazabilidad de ejecucion:

- `pipeline_type`
- `status`
- `input_payload`
- `output_payload`
- `error_message`

### `approvals`

Revision humana:

- `target_type`: `scene` | `audit`
- `target_id`
- `decision`: `approve` | `request_changes` | `reject`
- `reviewer`
- `notes`

## Estado derivado

El MVP tambien calcula un snapshot de workflow por escena, pero no lo persiste como tabla dedicada.

Incluye:

- si la unidad paso el Necessity Test
- que pipeline puede correr a continuacion
- blockers editoriales
- siguiente accion recomendada
- si la escena ya esta lista para aprobacion humana

Esto se recalcula desde:

- `scenes`
- `audits`
- `approvals`
- `project_memories`

## Necessity Test

Toda unidad planificada debe registrar:

- que cambia realmente
- que se rompe si la escena desaparece
- como contribuye al conflicto
- cual es el giro o desplazamiento dramatico
- decision editorial: `keep`, `rework` o `cut`

## Notas de alcance

- No hay tabla de capitulos o secciones en el MVP. `chapter_label` cubre la necesidad inmediata sin elevar complejidad.
- No hay versionado fino por parrafo todavia. La trazabilidad vive primero en `pipeline_runs`, auditorias y aprobaciones.
- `style_dna`, `editorial_judgment` y `anti_patterns` viven en `projects` para que la carta editorial global sea editable.
