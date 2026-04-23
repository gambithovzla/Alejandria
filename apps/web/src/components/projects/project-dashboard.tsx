'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition, useEffect, useState } from 'react'

import type {
  ApprovalDecision,
  AuditReport,
  AuditType,
  LLMHealthStatus,
  MemoryStatus,
  PipelineRunSummary,
  ProjectDetail,
  ProjectSummary,
  SceneSummary,
} from '@novel-engine/contracts'

import { ProjectCreateForm } from '@/components/forms/project-create-form'
import { SceneCreateForm } from '@/components/forms/scene-create-form'
import { ApprovalComposer } from '@/components/projects/approval-composer'
import { ProjectEditorialProfileForm } from '@/components/projects/project-editorial-profile-form'
import { ProjectLLMConsole } from '@/components/projects/project-llm-console'
import { ProjectMemoryBoard } from '@/components/projects/project-memory-board'
import { ProjectPipelineTimeline } from '@/components/projects/project-pipeline-timeline'
import { SceneDraftVersionsPanel } from '@/components/projects/scene-draft-versions-panel'
import { SceneWorkflowPanel } from '@/components/projects/scene-workflow-panel'
import {
  activateDraftVersion,
  continueToNextScene,
  createAuditApproval,
  createSceneApproval,
  getExportUrl,
  rewriteSceneFromAudits,
  runAudit,
  runScenePlanning,
  runSceneWriting,
  updateMemory,
} from '@/lib/api'
import { getProjectStructureCopy, getWorkTypeLabel } from '@/lib/project-structure'
import { getApprovedScenes, getBookRoute } from '@/lib/project-reading'
import { formatWorkflowMessage, getApprovalDecisionLabel, getAuditDecisionLabel, getAuditTypeLabel } from '@/lib/workflow-copy'

type WorkspaceView = 'mesa' | 'project' | 'book' | 'memory' | 'activity'
type SceneWorkspaceSection = 'workflow' | 'text' | 'audits' | 'versions' | 'approval'

interface ProjectDashboardProps {
  llmHealth: LLMHealthStatus | null
  pipelineRuns: PipelineRunSummary[]
  projects: ProjectSummary[]
  selectedProject: ProjectDetail | null
}

export function ProjectDashboard({ llmHealth, pipelineRuns, projects, selectedProject }: ProjectDashboardProps) {
  const router = useRouter()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('mesa')
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(selectedProject?.scenes[0]?.id ?? null)
  const [sceneSection, setSceneSection] = useState<SceneWorkspaceSection>('workflow')
  const selectedProjectCopy = selectedProject ? getProjectStructureCopy(selectedProject.structureMode) : null
  const unitLabel = selectedProjectCopy?.singular ?? 'unidad'

  useEffect(() => {
    setWorkspaceView('mesa')
    setExpandedSceneId(selectedProject?.scenes[0]?.id ?? null)
    setSceneSection('workflow')
    setFeedback(null)
  }, [selectedProject?.id])

  async function handlePipeline(sceneId: string, action: 'plan' | 'write' | 'rewrite' | AuditType) {
    const key = `${sceneId}:${action}`
    setBusyKey(key)
    setFeedback(null)

    try {
      if (action === 'plan') {
        await runScenePlanning(sceneId)
      } else if (action === 'write') {
        await runSceneWriting(sceneId)
      } else if (action === 'rewrite') {
        await rewriteSceneFromAudits(sceneId)
      } else {
        await runAudit(sceneId, action)
      }
      startTransition(() => router.refresh())
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo ejecutar el pipeline.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleSceneApproval(sceneId: string, input: { reviewer: string; notes: string; decision: ApprovalDecision }) {
    setFeedback(null)
    await createSceneApproval(sceneId, input)
    startTransition(() => router.refresh())
  }

  async function handleAuditApproval(auditId: string, input: { reviewer: string; notes: string; decision: ApprovalDecision }) {
    setFeedback(null)
    await createAuditApproval(auditId, input)
    startTransition(() => router.refresh())
  }

  async function handleMemoryUpdate(memoryId: string, status: MemoryStatus, notes: string | null) {
    if (!selectedProject) {
      return
    }

    const key = `memory:${memoryId}:${status}`
    setBusyKey(key)
    setFeedback(null)

    try {
      await updateMemory(selectedProject.id, memoryId, { status, notes })
      startTransition(() => router.refresh())
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo actualizar la memoria.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleDraftVersionActivation(sceneId: string, versionId: string) {
    const key = `scene:${sceneId}:activate:${versionId}`
    setBusyKey(key)
    setFeedback(null)

    try {
      await activateDraftVersion(sceneId, versionId)
      startTransition(() => router.refresh())
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo activar la version revisada.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleContinueToNextScene(sceneId: string, includeDraft: boolean) {
    const mode = includeDraft ? 'with-draft' : 'plan-only'
    const key = `scene:${sceneId}:continue:${mode}`
    setBusyKey(key)
    setFeedback(null)

    try {
      const createdScene = await continueToNextScene(sceneId, { includeDraft })
      setFeedback(
        includeDraft
          ? `Se propuso la siguiente ${unitLabel} con primer draft: ${createdScene.title}.`
          : `Se propuso la siguiente ${unitLabel} y ya quedo planificada: ${createdScene.title}.`,
      )
      startTransition(() => router.refresh())
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo proponer la siguiente unidad.')
    } finally {
      setBusyKey(null)
    }
  }

  function openSceneWorkspace(sceneId: string, section: SceneWorkspaceSection = 'workflow') {
    setWorkspaceView('mesa')
    setSceneSection(section)
    setExpandedSceneId((current) => (current === sceneId ? null : sceneId))
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="editorial-card rounded-[28px] p-5 md:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-moss">Repositorio editorial</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Proyectos</h2>
          </div>

          <ProjectCreateForm />

          <div className="grid gap-3">
            {projects.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-ink/15 bg-white/30 p-4 text-sm text-ink/68">
                Aun no hay proyectos. Crea uno para activar el estudio editorial.
              </div>
            ) : null}

            {projects.map((project) => {
              const isActive = selectedProject?.id === project.id
              const structureCopy = getProjectStructureCopy(project.structureMode)
              return (
                <Link
                  className={`rounded-[22px] border p-4 transition ${
                    isActive ? 'border-brass bg-brass/10' : 'border-ink/10 bg-white/35 hover:bg-white/60'
                  }`}
                  href={`/projects/${project.id}`}
                  key={project.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{project.title}</p>
                      <p className="mt-1 text-sm text-ink/68">
                        {getWorkTypeLabel(project.workType)} / {project.genre}
                      </p>
                    </div>
                    <span className="rounded-full border border-ink/10 px-2 py-1 text-xs text-ink/68">
                      {project.sceneCount} {structureCopy.countLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-ink/72">{project.premise}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </aside>

      <div className="grid gap-6">
        {selectedProject && selectedProjectCopy ? (
          <>
            {feedback ? (
              <div className="rounded-[24px] border border-red-800/10 bg-red-50/80 px-4 py-3 text-sm text-red-900">{feedback}</div>
            ) : null}

            <ProjectHero
              approvedScenes={getApprovedScenes(selectedProject)}
              pipelineRuns={pipelineRuns}
              project={selectedProject}
              projectCopy={selectedProjectCopy}
            />

            <WorkspaceTabs
              activeView={workspaceView}
              items={[
                { id: 'mesa', label: 'Mesa', detail: 'Unidades y workflow', value: `${selectedProject.scenes.length}` },
                { id: 'project', label: 'Proyecto', detail: 'Carta editorial', value: 'perfil' },
                { id: 'book', label: 'Libro', detail: 'Lector aprobado', value: `${getApprovedScenes(selectedProject).length}` },
                { id: 'memory', label: 'Memoria', detail: 'Canon y notas', value: `${selectedProject.memories.length}` },
                { id: 'activity', label: 'Actividad', detail: 'Runs y auditoria', value: `${pipelineRuns.length}` },
              ]}
              onChange={setWorkspaceView}
            />

            {workspaceView === 'project' ? (
              <section className="editorial-card rounded-[28px] p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-plum">Perfil editable</p>
                    <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Carta editorial del proyecto</h3>
                  </div>
                  <span className="rounded-full border border-ink/10 bg-white/35 px-3 py-2 text-xs uppercase tracking-[0.24em] text-ink/64">
                    Style DNA, judgment y anti-patterns editables
                  </span>
                </div>
                <ProjectEditorialProfileForm project={selectedProject} />
              </section>
            ) : null}

            {workspaceView === 'memory' ? (
              <ProjectMemoryBoard busyKey={busyKey} memories={selectedProject.memories} onUpdate={handleMemoryUpdate} />
            ) : null}

            {workspaceView === 'activity' ? (
              <div className="grid gap-6">
                <ProjectLLMConsole runs={pipelineRuns} status={llmHealth} />
                <ProjectPipelineTimeline runs={pipelineRuns} scenes={selectedProject.scenes} />
              </div>
            ) : null}

            {workspaceView === 'book' ? (
              <BookWorkspace approvedScenes={getApprovedScenes(selectedProject)} project={selectedProject} projectCopy={selectedProjectCopy} />
            ) : null}

            {workspaceView === 'mesa' ? (
              <section className="editorial-card rounded-[28px] p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-plum">{selectedProjectCopy.boardEyebrow}</p>
                    <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Mesa de {selectedProjectCopy.plural}</h3>
                    <p className="mt-2 max-w-3xl text-sm text-ink/68">
                      Cada {selectedProjectCopy.singular} se abre bajo demanda para que no tengas que hacer scroll por todo el proyecto al mismo tiempo.
                    </p>
                  </div>
                  <span className="rounded-full border border-ink/10 bg-white/35 px-3 py-2 text-xs uppercase tracking-[0.24em] text-ink/64">
                    {selectedProjectCopy.planningHint}
                  </span>
                </div>

                <div className="mb-6" id="manual-next-unit-form">
                  <SceneCreateForm projectId={selectedProject.id} structureMode={selectedProject.structureMode} />
                </div>

                <div className="grid gap-4">
                  {selectedProject.scenes.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-ink/15 bg-white/30 p-6 text-sm text-ink/68">
                      {selectedProjectCopy.emptyState}
                    </div>
                  ) : null}

                  {selectedProject.scenes.map((scene) => (
                    <SceneWorkspaceCard
                      busyKey={busyKey}
                      expanded={expandedSceneId === scene.id}
                      key={scene.id}
                      onAuditApproval={handleAuditApproval}
                      onContinueToNextScene={handleContinueToNextScene}
                      onOpenSceneWorkspace={openSceneWorkspace}
                      onPipeline={handlePipeline}
                      onSceneApproval={handleSceneApproval}
                      onSelectSection={setSceneSection}
                      onVersionActivate={handleDraftVersionActivation}
                      projectId={selectedProject.id}
                      projectStructureMode={selectedProject.structureMode}
                      projectUnitCopy={selectedProjectCopy}
                      scene={scene}
                      section={sceneSection}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <section className="editorial-card rounded-[28px] p-8">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <p className="text-xs uppercase tracking-[0.34em] text-plum">MVP</p>
              <h2 className="font-[family-name:var(--font-display)] text-4xl text-ink">Selecciona un proyecto para abrir la mesa editorial.</h2>
              <p className="text-sm leading-6 text-ink/72">
                El estudio ahora separa mejor mesa, libro, memoria y actividad para que el trabajo no se vuelva una sola pagina infinita.
              </p>
            </div>
          </section>
        )}
      </div>
    </section>
  )
}

function ProjectHero({
  approvedScenes,
  pipelineRuns,
  project,
  projectCopy,
}: {
  approvedScenes: SceneSummary[]
  pipelineRuns: PipelineRunSummary[]
  project: ProjectDetail
  projectCopy: ReturnType<typeof getProjectStructureCopy>
}) {
  const firstApprovedScene = approvedScenes[0] ?? null

  return (
    <section className="editorial-card rounded-[28px] p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.34em] text-plum">Proyecto activo</p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl text-ink">{project.title}</h2>
            <p className="max-w-3xl text-sm leading-6 text-ink/74">{project.premise}</p>
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-ink/60">
              <span className="rounded-full border border-ink/10 px-3 py-1">{getWorkTypeLabel(project.workType)}</span>
              <span className="rounded-full border border-ink/10 px-3 py-1">{project.genre}</span>
              <span className="rounded-full border border-ink/10 px-3 py-1">Modo {projectCopy.singularTitle}</span>
              <span className="rounded-full border border-ink/10 px-3 py-1">Lector {approvedScenes.length}/{project.scenes.length}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-ink/10 bg-white/35 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-brass">Style DNA</p>
              <p className="mt-2 text-sm text-ink/72">{project.styleDna.voiceReference}</p>
            </div>
            <div className="rounded-[20px] border border-ink/10 bg-white/35 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-brass">Editorial judgment</p>
              <p className="mt-2 text-sm text-ink/72">{project.editorialJudgment.northStar}</p>
            </div>
            <div className="rounded-[20px] border border-ink/10 bg-white/35 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-brass">Anti-patterns</p>
              <p className="mt-2 text-sm text-ink/72">
                {project.antiPatterns.length > 0 ? project.antiPatterns.map((pattern) => pattern.label).join(', ') : 'Sin anti-patterns definidos.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] border border-ink/10 bg-white/42 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-moss">Libro y export</p>
                <p className="text-sm text-ink/68">Workspace legible y manuscrito aprobado descargable.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="action-button" href={getExportUrl(project.id, 'json')} rel="noreferrer" target="_blank">
                  JSON
                </a>
                <a className="action-button" href={getExportUrl(project.id, 'markdown')} rel="noreferrer" target="_blank">
                  Markdown
                </a>
                <a className="action-button" href={getExportUrl(project.id, 'book-markdown')} rel="noreferrer" target="_blank">
                  Manuscrito
                </a>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-ink/74">
              <p>Memoria factual: {project.memories.filter((memory) => memory.kind === 'factual').length}</p>
              <p>Memoria dramatica: {project.memories.filter((memory) => memory.kind === 'dramatic').length}</p>
              <p>{projectCopy.pluralTitle}: {project.scenes.length}</p>
              <p>Runs registrados: {pipelineRuns.length}</p>
              <p>Lecturas aprobadas: {approvedScenes.length}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-brass/16 bg-brass/8 p-4">
            <p className="text-xs uppercase tracking-[0.26em] text-brass">Modo lector</p>
            <p className="mt-2 text-sm leading-6 text-ink/74">
              El libro aprobado se abre una unidad a la vez para que puedas leerlo desde el movil sin perderte en scroll infinito.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {firstApprovedScene ? (
                <Link className="action-button action-button--primary" href={getBookRoute(project.id, firstApprovedScene.sequenceNo)}>
                  Abrir lector
                </Link>
              ) : (
                <span className="action-button action-button--primary cursor-default opacity-45">Sin unidades aprobadas</span>
              )}
              <a className="action-button" href={getExportUrl(project.id, 'book-markdown')} rel="noreferrer" target="_blank">
                Descargar manuscrito
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function WorkspaceTabs({
  activeView,
  items,
  onChange,
}: {
  activeView: WorkspaceView
  items: Array<{ id: WorkspaceView; label: string; detail: string; value: string }>
  onChange: (view: WorkspaceView) => void
}) {
  return (
    <section className="editorial-card sticky top-4 z-20 rounded-[24px] p-3">
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item) => (
          <button
            className={`workspace-tab ${activeView === item.id ? 'workspace-tab--active' : ''}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <span className="text-left">
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs text-ink/60">{item.detail}</span>
            </span>
            <span className="rounded-full border border-current/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em]">{item.value}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function BookWorkspace({
  approvedScenes,
  project,
  projectCopy,
}: {
  approvedScenes: SceneSummary[]
  project: ProjectDetail
  projectCopy: ReturnType<typeof getProjectStructureCopy>
}) {
  const firstApprovedScene = approvedScenes[0] ?? null

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="editorial-card rounded-[28px] p-5 md:p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-plum">Libro vivo</p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Lectura enfocada desde lo aprobado</h3>
        <p className="mt-4 text-sm leading-6 text-ink/74">
          Esta vista junta las {projectCopy.plural} ya aprobadas como manuscrito continuo. Cada una se lee en su propia pagina para
          que el telefono se comporte como un lector y no como una pared infinita de scroll.
        </p>

        <div className="mt-5 grid gap-2 text-sm text-ink/72">
          <p>{approvedScenes.length} {projectCopy.countLabel} forman el libro visible ahora mismo.</p>
          <p>La descarga `Manuscrito` incluye solo las unidades aprobadas.</p>
          <p>La PWA prioriza el modo lector para abrir rapido desde el movil.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {firstApprovedScene ? (
            <Link className="action-button action-button--primary" href={getBookRoute(project.id, firstApprovedScene.sequenceNo)}>
              Abrir modo libro
            </Link>
          ) : (
            <span className="action-button action-button--primary cursor-default opacity-45">Aprueba una unidad para leerla</span>
          )}
          <a className="action-button" href={getExportUrl(project.id, 'book-markdown')} rel="noreferrer" target="_blank">
            Descargar manuscrito
          </a>
        </div>
      </article>

      <article className="editorial-card rounded-[28px] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-moss">Indice aprobado</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Tabla de lectura</h3>
          </div>
          <span className="rounded-full border border-ink/10 px-3 py-2 text-xs uppercase tracking-[0.24em] text-ink/64">
            {approvedScenes.length} en libro
          </span>
        </div>

        {approvedScenes.length === 0 ? (
          <div className="mt-5 rounded-[22px] border border-dashed border-ink/12 bg-white/35 p-5 text-sm text-ink/66">
            Cuando apruebes {projectCopy.plural}, apareceran aqui como indice del libro y podras abrirlas desde el lector.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {approvedScenes.map((scene, index) => (
              <Link
                className="rounded-[20px] border border-ink/10 bg-white/35 p-4 transition hover:bg-white/65"
                href={getBookRoute(project.id, scene.sequenceNo)}
                key={scene.id}
              >
                <p className="text-xs uppercase tracking-[0.22em] text-moss">
                  {projectCopy.singularTitle} {index + 1}
                </p>
                <p className="mt-2 font-semibold text-ink">{scene.title}</p>
                <p className="mt-2 text-sm text-ink/68">{scene.purpose}</p>
              </Link>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}

function SceneWorkspaceCard({
  busyKey,
  expanded,
  onAuditApproval,
  onContinueToNextScene,
  onOpenSceneWorkspace,
  onPipeline,
  onSceneApproval,
  onSelectSection,
  onVersionActivate,
  projectId,
  projectStructureMode,
  projectUnitCopy,
  scene,
  section,
}: {
  busyKey: string | null
  expanded: boolean
  onAuditApproval: (auditId: string, input: { reviewer: string; notes: string; decision: ApprovalDecision }) => Promise<void>
  onContinueToNextScene: (sceneId: string, includeDraft: boolean) => Promise<void>
  onOpenSceneWorkspace: (sceneId: string, section?: SceneWorkspaceSection) => void
  onPipeline: (sceneId: string, action: 'plan' | 'write' | 'rewrite' | AuditType) => Promise<void>
  onSceneApproval: (sceneId: string, input: { reviewer: string; notes: string; decision: ApprovalDecision }) => Promise<void>
  onSelectSection: (section: SceneWorkspaceSection) => void
  onVersionActivate: (sceneId: string, versionId: string) => Promise<void>
  projectId: string
  projectStructureMode: ProjectDetail['structureMode']
  projectUnitCopy: ReturnType<typeof getProjectStructureCopy>
  scene: SceneSummary
  section: SceneWorkspaceSection
}) {
  const unitLabel = projectUnitCopy.singular
  const isApproved = scene.workflow.latestSceneApprovalDecision === 'approve'
  const readerHref = isApproved ? getBookRoute(projectId, scene.sequenceNo) : null

  return (
    <article className={`rounded-[28px] border border-ink/12 bg-white/40 p-5 transition ${expanded ? 'shadow-[0_22px_50px_rgba(47,34,22,0.12)]' : ''}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-ink/58">
            <span className="rounded-full border border-ink/10 px-3 py-1">
              {projectUnitCopy.singularTitle} {scene.sequenceNo}
            </span>
            <span className="rounded-full border border-ink/10 px-3 py-1">{scene.status}</span>
            <span className="rounded-full border border-ink/10 px-3 py-1">
              {scene.workflow.canApproveScene ? 'lista para cerrar' : 'en trabajo'}
            </span>
          </div>
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-3xl text-ink">{scene.title}</h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/74">{scene.brief}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-ink/60">
            <span className="rounded-full border border-ink/10 px-3 py-1">Foco {scene.povCharacter || 'sin definir'}</span>
            <span className="rounded-full border border-ink/10 px-3 py-1">{scene.location || 'sin localizacion'}</span>
            <span className="rounded-full border border-ink/10 px-3 py-1">
              Necesidad {scene.necessityAssessment?.decision || 'pendiente'}
            </span>
            <span className="rounded-full border border-ink/10 px-3 py-1">
              Proxima accion {formatWorkflowMessage(scene.workflow.nextRecommendedAction, unitLabel)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[420px] lg:justify-end">
          {readerHref ? (
            <Link className="action-button" href={readerHref}>
              Leer
            </Link>
          ) : null}
          {scene.workflow.canApproveScene ? (
            <button className="action-button" onClick={() => onOpenSceneWorkspace(scene.id, 'approval')} type="button">
              Ir a aprobacion
            </button>
          ) : null}
          <button
            className={`action-button ${expanded ? '' : 'action-button--primary'}`}
            onClick={() => onOpenSceneWorkspace(scene.id, section)}
            type="button"
          >
            {expanded ? 'Cerrar mesa' : 'Abrir mesa'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-ink/10 pt-5">
          <div className="flex flex-wrap gap-2">
            <PipelineButton
              busyKey={busyKey}
              disabled={false}
              hint={`La prueba de necesidad de la ${unitLabel} y las memorias se regeneran aqui.`}
              label="Planificar"
              onClick={() => onPipeline(scene.id, 'plan')}
              sceneId={scene.id}
              tone="primary"
              value="plan"
            />
            <PipelineButton
              busyKey={busyKey}
              disabled={!scene.workflow.canRunWriting}
              hint={
                scene.workflow.canRunWriting
                  ? `Genera el draft de la ${unitLabel}.`
                  : scene.workflow.blockers.map((blocker) => formatWorkflowMessage(blocker, unitLabel)).join(' ')
              }
              label="Redactar"
              onClick={() => onPipeline(scene.id, 'write')}
              sceneId={scene.id}
              value="write"
            />
            <PipelineButton
              busyKey={busyKey}
              disabled={!scene.workflow.canRewriteFromAudits}
              hint={
                scene.workflow.canRewriteFromAudits
                  ? `Genera una propuesta revisada de la ${unitLabel} sin pisar el draft actual.`
                  : 'Necesitas un draft y observaciones de auditoria para reescribir con apoyo de IA.'
              }
              label="Aplicar mejoras"
              onClick={() => onPipeline(scene.id, 'rewrite')}
              sceneId={scene.id}
              tone="primary"
              value="rewrite"
            />
            <PipelineButton
              busyKey={busyKey}
              disabled={!scene.workflow.canRunTechnicalAudit}
              hint={
                scene.workflow.canRunTechnicalAudit
                  ? 'Auditoria de continuidad y causalidad.'
                  : scene.workflow.blockers.map((blocker) => formatWorkflowMessage(blocker, unitLabel)).join(' ')
              }
              label="Auditar continuidad"
              onClick={() => onPipeline(scene.id, 'technical')}
              sceneId={scene.id}
              value="technical"
            />
            <PipelineButton
              busyKey={busyKey}
              disabled={!scene.workflow.canRunLiteraryAudit}
              hint={
                scene.workflow.canRunLiteraryAudit
                  ? 'Auditoria de voz, tension y subtexto.'
                  : scene.workflow.blockers.map((blocker) => formatWorkflowMessage(blocker, unitLabel)).join(' ')
              }
              label="Auditar voz"
              onClick={() => onPipeline(scene.id, 'literary')}
              sceneId={scene.id}
              value="literary"
            />
            <PipelineButton
              busyKey={busyKey}
              disabled={!scene.workflow.canRunAdversarialAudit}
              hint={
                scene.workflow.canRunAdversarialAudit
                  ? 'Red team editorial.'
                  : scene.workflow.blockers.map((blocker) => formatWorkflowMessage(blocker, unitLabel)).join(' ')
              }
              label="Auditar friccion"
              onClick={() => onPipeline(scene.id, 'adversarial')}
              sceneId={scene.id}
              value="adversarial"
            />
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto">
            {[
              { id: 'workflow', label: 'Workflow' },
              { id: 'text', label: 'Texto' },
              { id: 'audits', label: 'Auditorias' },
              { id: 'versions', label: 'Versiones' },
              { id: 'approval', label: 'Aprobacion' },
            ].map((item) => (
              <button
                className={`workspace-tab workspace-tab--compact ${section === item.id ? 'workspace-tab--active' : ''}`}
                key={item.id}
                onClick={() => onSelectSection(item.id as SceneWorkspaceSection)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {section === 'workflow' ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1fr_0.85fr]">
              <section className="rounded-[22px] border border-ink/10 bg-[#fffdf9]/70 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-brass">Plan</p>
                {scene.planningPayload ? (
                  <div className="mt-3 space-y-3 text-sm text-ink/76">
                    <p>{scene.planningPayload.logline}</p>
                    <p>
                      <span className="font-semibold text-ink">Conflicto:</span> {scene.planningPayload.conflict}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Giro:</span> {scene.planningPayload.turn}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/58">{projectUnitCopy.planningEmpty}</p>
                )}
              </section>

              <SceneWorkflowPanel unitLabel={unitLabel} workflow={scene.workflow} />

              <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-moss">{projectUnitCopy.necessityLabel}</p>
                {scene.necessityAssessment ? (
                  <div className="mt-3 space-y-2 text-sm text-ink/76">
                    <p>{scene.necessityAssessment.changeTrigger}</p>
                    <p>{scene.necessityAssessment.stakesIfRemoved}</p>
                    <p>{scene.necessityAssessment.dramaticShift}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/58">Pendiente de planificacion.</p>
                )}
              </section>
            </div>
          ) : null}

          {section === 'text' ? (
            <section className="mt-5 rounded-[24px] border border-ink/10 bg-[#fffdf9]/72 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-brass">Draft activo</p>
                  <p className="mt-2 text-sm text-ink/68">
                    Aqui vive el texto operativo de la {unitLabel}. Las propuestas revisadas se gestionan en `Versiones`.
                  </p>
                </div>
                {readerHref ? (
                  <Link className="action-button" href={readerHref}>
                    Leer como libro
                  </Link>
                ) : null}
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-ink/78">
                {scene.draftMarkdown || projectUnitCopy.draftEmpty}
              </p>
            </section>
          ) : null}

          {section === 'audits' ? (
            <div className="mt-5 grid gap-3">
              <p className="text-xs uppercase tracking-[0.26em] text-moss">Auditorias separadas</p>
              {scene.audits.length === 0 ? (
                <p className="rounded-[18px] border border-dashed border-ink/12 bg-white/45 p-4 text-sm text-ink/58">
                  Aun no se ejecutaron auditorias.
                </p>
              ) : null}

              {scene.audits.map((audit) => (
                <AuditCard audit={audit} key={audit.id} onSubmitApproval={(input) => onAuditApproval(audit.id, input)} />
              ))}
            </div>
          ) : null}

          {section === 'versions' ? (
            <div className="mt-5">
              <SceneDraftVersionsPanel
                busyKey={busyKey}
                onActivateVersion={onVersionActivate}
                scene={scene}
                structureMode={projectStructureMode}
              />
            </div>
          ) : null}

          {section === 'approval' ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.26em] text-moss">{projectUnitCopy.approvalLabel}</p>
                  <span className="rounded-full border border-ink/10 px-2 py-1 text-xs uppercase tracking-[0.18em] text-ink/66">
                    {getApprovalDecisionLabel(scene.workflow.latestSceneApprovalDecision)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-ink/72">
                  <p>Continuacion guiada: {scene.workflow.canContinueToNext ? 'habilitada' : 'pendiente'}</p>
                  <p>En libro: {isApproved ? 'si' : 'todavia no'}</p>
                  <p>Tecnico: {getAuditDecisionLabel(scene.workflow.technicalAuditDecision)}</p>
                  <p>Literario: {getAuditDecisionLabel(scene.workflow.literaryAuditDecision)}</p>
                  <p>Adversarial: {getAuditDecisionLabel(scene.workflow.adversarialAuditDecision)}</p>
                </div>

                {!scene.workflow.canApproveScene && scene.workflow.blockers.length > 0 ? (
                  <div className="mt-4 rounded-[18px] border border-red-900/10 bg-red-50/60 p-3 text-sm text-red-900">
                    <p>Para aprobar esta {unitLabel} aun falta:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {scene.workflow.blockers.map((blocker) => (
                        <li key={blocker}>{formatWorkflowMessage(blocker, unitLabel)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
                <ApprovalComposer
                  disabled={!scene.workflow.canApproveScene}
                  initialNotes="Lista para revision global."
                  onSubmit={(input) => onSceneApproval(scene.id, input)}
                  submitLabel={`Registrar aprobacion de ${unitLabel}`}
                />

                {isApproved ? (
                  <div className="mt-4 rounded-[18px] border border-emerald-800/12 bg-emerald-50/60 p-4 text-sm text-emerald-950">
                    <p>
                      Esta {unitLabel} ya entro al libro aprobado. Ahora puedes continuar la secuencia o abrirla en el lector.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {readerHref ? (
                        <Link className="action-button" href={readerHref}>
                          Leer
                        </Link>
                      ) : null}
                      <button
                        className="action-button action-button--primary"
                        disabled={busyKey === `scene:${scene.id}:continue:plan-only` || !scene.workflow.canContinueToNext}
                        onClick={() => onContinueToNextScene(scene.id, false)}
                        type="button"
                      >
                        {busyKey === `scene:${scene.id}:continue:plan-only` ? 'Proponiendo...' : `Proponer siguiente ${unitLabel}`}
                      </button>
                      <button
                        className="action-button"
                        disabled={busyKey === `scene:${scene.id}:continue:with-draft` || !scene.workflow.canContinueToNext}
                        onClick={() => onContinueToNextScene(scene.id, true)}
                        type="button"
                      >
                        {busyKey === `scene:${scene.id}:continue:with-draft` ? 'Generando draft...' : 'Proponer + primer draft'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function AuditCard({
  audit,
  onSubmitApproval,
}: {
  audit: AuditReport
  onSubmitApproval: (input: { reviewer: string; notes: string; decision: ApprovalDecision }) => Promise<void>
}) {
  const auditLabel = getAuditTypeLabel(audit.auditType)

  return (
    <article className="rounded-[22px] border border-ink/10 bg-white/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold capitalize text-ink">{auditLabel}</p>
        <span className="rounded-full border border-ink/10 px-2 py-1 text-xs uppercase tracking-[0.18em] text-ink/66">
          {getAuditDecisionLabel(audit.decision)}
        </span>
      </div>

      <p className="mt-2 text-sm text-ink/74">{audit.summary}</p>

      {audit.findings.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-ink/72">
          {audit.findings.map((finding) => (
            <li key={`${audit.id}-${finding.area}-${finding.issue}`}>{finding.issue}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 grid gap-2 text-sm text-ink/66">
        <p>Revision humana: {audit.humanReviewRequired ? 'requerida' : 'opcional'}</p>
        <p>Ultima aprobacion: {getApprovalDecisionLabel(audit.approvals[0]?.decision)}</p>
      </div>

      {audit.humanReviewRequired || audit.approvals.length > 0 ? (
        <div className="mt-4">
          <ApprovalComposer
            initialNotes={`Revision humana del audit ${auditLabel}.`}
            onSubmit={onSubmitApproval}
            submitLabel={`Revisar ${auditLabel}`}
          />
        </div>
      ) : null}
    </article>
  )
}

function PipelineButton({
  sceneId,
  value,
  label,
  busyKey,
  disabled,
  hint,
  onClick,
  tone = 'default',
}: {
  sceneId: string
  value: string
  label: string
  busyKey: string | null
  disabled: boolean
  hint: string
  onClick: () => void
  tone?: 'default' | 'primary'
}) {
  const isBusy = busyKey === `${sceneId}:${value}`
  const className = tone === 'primary' ? 'action-button action-button--primary' : 'action-button'

  return (
    <button className={className} disabled={disabled || isBusy} onClick={onClick} title={hint} type="button">
      {isBusy ? 'Ejecutando...' : label}
    </button>
  )
}
