import type { StructureMode, WorkType } from '@novel-engine/contracts'

export const WORK_TYPE_OPTIONS: Array<{ value: WorkType; label: string }> = [
  { value: 'novel', label: 'Novela' },
  { value: 'essay', label: 'Ensayo' },
  { value: 'narrative_nonfiction', label: 'No ficcion narrativa' },
  { value: 'biography', label: 'Biografia' },
  { value: 'memoir', label: 'Memorias' },
  { value: 'practical', label: 'Libro practico' },
  { value: 'hybrid', label: 'Hibrido' },
]

export const STRUCTURE_MODE_OPTIONS: Array<{ value: StructureMode; label: string }> = [
  { value: 'scene', label: 'Escena' },
  { value: 'section', label: 'Seccion' },
  { value: 'episode', label: 'Episodio' },
  { value: 'module', label: 'Modulo' },
]

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  novel: 'Novela',
  essay: 'Ensayo',
  narrative_nonfiction: 'No ficcion narrativa',
  biography: 'Biografia',
  memoir: 'Memorias',
  practical: 'Libro practico',
  hybrid: 'Hibrido',
}

const RECOMMENDED_STRUCTURE_MODE: Record<WorkType, StructureMode> = {
  novel: 'scene',
  essay: 'section',
  narrative_nonfiction: 'episode',
  biography: 'episode',
  memoir: 'episode',
  practical: 'module',
  hybrid: 'section',
}

const STRUCTURE_COPY: Record<
  StructureMode,
  {
    singular: string
    singularTitle: string
    plural: string
    pluralTitle: string
    boardEyebrow: string
    boardTitle: string
    countLabel: string
    creationButton: string
    emptyState: string
    planningHint: string
    purposeLabel: string
    purposePlaceholder: string
    briefLabel: string
    briefPlaceholder: string
    titleLabel: string
    titlePlaceholder: string
    focusLabel: string
    focusPlaceholder: string
    locationLabel: string
    locationPlaceholder: string
    draftEmpty: string
    planningEmpty: string
    approvalLabel: string
    necessityLabel: string
  }
> = {
  scene: {
    singular: 'escena',
    singularTitle: 'Escena',
    plural: 'escenas',
    pluralTitle: 'Escenas',
    boardEyebrow: 'Scene planning board',
    boardTitle: 'Escenas',
    countLabel: 'escenas',
    creationButton: 'Agregar escena',
    emptyState: 'No hay escenas aun. El flujo MVP empieza creando una escena y luego corriendo planning, writing y auditorias.',
    planningHint: 'Prueba de necesidad de la escena obligatoria',
    purposeLabel: 'Proposito editorial de la escena',
    purposePlaceholder: 'Proposito editorial de la escena',
    briefLabel: 'Brief de la escena',
    briefPlaceholder: 'Brief de la escena',
    titleLabel: 'Titulo de escena',
    titlePlaceholder: 'Titulo de escena',
    focusLabel: 'Personaje POV',
    focusPlaceholder: 'POV',
    locationLabel: 'Localizacion',
    locationPlaceholder: 'Localizacion',
    draftEmpty: 'Todavia no hay draft de escena.',
    planningEmpty: 'Todavia no hay plan validado.',
    approvalLabel: 'Aprobacion de escena',
    necessityLabel: 'Prueba de necesidad de la escena',
  },
  section: {
    singular: 'seccion',
    singularTitle: 'Seccion',
    plural: 'secciones',
    pluralTitle: 'Secciones',
    boardEyebrow: 'Planning board',
    boardTitle: 'Secciones',
    countLabel: 'secciones',
    creationButton: 'Agregar seccion',
    emptyState: 'No hay secciones aun. Crea un bloque argumental o una seccion antes de correr planning, writing y auditorias.',
    planningHint: 'Prueba de necesidad de la seccion obligatoria',
    purposeLabel: 'Proposito editorial de la seccion',
    purposePlaceholder: 'Que debe mover esta seccion',
    briefLabel: 'Brief de la seccion',
    briefPlaceholder: 'Brief del bloque argumental o seccion',
    titleLabel: 'Titulo de seccion',
    titlePlaceholder: 'Titulo de seccion',
    focusLabel: 'Voz o foco',
    focusPlaceholder: 'Voz, autor o foco',
    locationLabel: 'Marco o contexto',
    locationPlaceholder: 'Marco, debate o contexto',
    draftEmpty: 'Todavia no hay draft de seccion.',
    planningEmpty: 'Todavia no hay plan validado.',
    approvalLabel: 'Aprobacion de seccion',
    necessityLabel: 'Prueba de necesidad de la seccion',
  },
  episode: {
    singular: 'episodio',
    singularTitle: 'Episodio',
    plural: 'episodios',
    pluralTitle: 'Episodios',
    boardEyebrow: 'Planning board',
    boardTitle: 'Episodios',
    countLabel: 'episodios',
    creationButton: 'Agregar episodio',
    emptyState: 'No hay episodios aun. Crea un episodio y luego corre planning, writing y auditorias separadas.',
    planningHint: 'Prueba de necesidad del episodio obligatoria',
    purposeLabel: 'Proposito editorial del episodio',
    purposePlaceholder: 'Que debe cambiar este episodio',
    briefLabel: 'Brief del episodio',
    briefPlaceholder: 'Brief del episodio',
    titleLabel: 'Titulo del episodio',
    titlePlaceholder: 'Titulo del episodio',
    focusLabel: 'Figura o voz focal',
    focusPlaceholder: 'Figura central o voz',
    locationLabel: 'Contexto o lugar',
    locationPlaceholder: 'Contexto o lugar',
    draftEmpty: 'Todavia no hay draft de episodio.',
    planningEmpty: 'Todavia no hay plan validado.',
    approvalLabel: 'Aprobacion de episodio',
    necessityLabel: 'Prueba de necesidad del episodio',
  },
  module: {
    singular: 'modulo',
    singularTitle: 'Modulo',
    plural: 'modulos',
    pluralTitle: 'Modulos',
    boardEyebrow: 'Planning board',
    boardTitle: 'Modulos',
    countLabel: 'modulos',
    creationButton: 'Agregar modulo',
    emptyState: 'No hay modulos aun. Crea una leccion o modulo antes de correr planning, writing y auditorias.',
    planningHint: 'Prueba de necesidad del modulo obligatoria',
    purposeLabel: 'Proposito editorial del modulo',
    purposePlaceholder: 'Que debe resolver este modulo',
    briefLabel: 'Brief del modulo',
    briefPlaceholder: 'Brief del modulo o leccion',
    titleLabel: 'Titulo del modulo',
    titlePlaceholder: 'Titulo del modulo',
    focusLabel: 'Instructor o voz guia',
    focusPlaceholder: 'Instructor o voz guia',
    locationLabel: 'Ambito o caso',
    locationPlaceholder: 'Ambito, caso o problema',
    draftEmpty: 'Todavia no hay draft de modulo.',
    planningEmpty: 'Todavia no hay plan validado.',
    approvalLabel: 'Aprobacion de modulo',
    necessityLabel: 'Prueba de necesidad del modulo',
  },
}

export function getRecommendedStructureMode(workType: WorkType): StructureMode {
  return RECOMMENDED_STRUCTURE_MODE[workType]
}

export function getProjectStructureCopy(structureMode: StructureMode) {
  return STRUCTURE_COPY[structureMode]
}

export function getWorkTypeLabel(workType: WorkType) {
  return WORK_TYPE_LABELS[workType]
}
