'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

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
import { ApprovalComposer } from '@/components/projects/approval-composer'
import { ProjectEditorialProfileForm } from '@/components/projects/project-editorial-profile-form'
import { SceneDraftVersionsPanel } from '@/components/projects/scene-draft-versions-panel'
import { ProjectLLMConsole } from '@/components/projects/project-llm-console'
import { ProjectMemoryBoard } from '@/components/projects/project-memory-board'
import { ProjectPipelineTimeline } from '@/components/projects/project-pipeline-timeline'
import { SceneWorkflowPanel } from '@/components/projects/scene-workflow-panel'
import { getProjectStructureCopy, getWorkTypeLabel } from '@/lib/project-structure'
import { formatWorkflowMessage, getApprovalDecisionLabel, getAuditDecisionLabel, getAuditTypeLabel } from '@/lib/workflow-copy'

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
  const selectedProjectCopy = selectedProject ? getProjectStructureCopy(selectedProject.structureMode) : null
  const unitLabel = selectedProjectCopy?.singular ?? 'unidad'

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
      const unitLabel = selectedProjectCopy?.singular ?? 'unidad'
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

  return (
    <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
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
        {selectedProject ? (
          <>
            {feedback ? (
              <div className="rounded-[24px] border border-red-800/10 bg-red-50/80 px-4 py-3 text-sm text-red-900">{feedback}</div>
            ) : null}

            <section className="editorial-card rounded-[28px] p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.34em] text-plum">Proyecto activo</p>
                    <h2 className="font-[family-name:var(--font-display)] text-4xl text-ink">{selectedProject.title}</h2>
                    <p className="max-w-3xl text-sm leading-6 text-ink/74">{selectedProject.premise}</p>
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-ink/60">
                      <span className="rounded-full border border-ink/10 px-3 py-1">{getWorkTypeLabel(selectedProject.workType)}</span>
                      <span className="rounded-full border border-ink/10 px-3 py-1">{selectedProject.genre}</span>
                      <span className="rounded-full border border-ink/10 px-3 py-1">
                        Modo {selectedProjectCopy?.singularTitle}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[20px] border border-ink/10 bg-white/35 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-brass">Style DNA</p>
                      <p className="mt-2 text-sm text-ink/72">{selectedProject.styleDna.voiceReference}</p>
                    </div>
                    <div className="rounded-[20px] border border-ink/10 bg-white/35 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-brass">Editorial judgment</p>
                      <p className="mt-2 text-sm text-ink/72">{selectedProject.editorialJudgment.northStar}</p>
                    </div>
                    <div className="rounded-[20px] border border-ink/10 bg-white/35 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-brass">Anti-patterns</p>
                      <p className="mt-2 text-sm text-ink/72">
                        {selectedProject.antiPatterns.map((pattern) => pattern.label).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-ink/10 bg-white/42 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-moss">Export</p>
                      <p className="text-sm text-ink/68">JSON y Markdown legibles.</p>
                    </div>
                    <div className="flex gap-2">
                      <a className="action-button" href={getExportUrl(selectedProject.id, 'json')} rel="noreferrer" target="_blank">
                        JSON
                      </a>
                      <a className="action-button" href={getExportUrl(selectedProject.id, 'markdown')} rel="noreferrer" target="_blank">
                        Markdown
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-ink/74">
                    <p>Memoria factual: {selectedProject.memories.filter((memory) => memory.kind === 'factual').length}</p>
                    <p>
                      Memoria dramatica: {selectedProject.memories.filter((memory) => memory.kind === 'dramatic').length}
                    </p>
                    <p>
                      {selectedProjectCopy?.pluralTitle}: {selectedProject.scenes.length}
                    </p>
                    <p>Runs registrados: {pipelineRuns.length}</p>
                    <p>Sin score unico: las auditorias permanecen separadas.</p>
                  </div>
                </div>
              </div>
            </section>

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

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <ProjectLLMConsole runs={pipelineRuns} status={llmHealth} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <ProjectMemoryBoard busyKey={busyKey} memories={selectedProject.memories} onUpdate={handleMemoryUpdate} />
              <ProjectPipelineTimeline runs={pipelineRuns} scenes={selectedProject.scenes} />
            </div>

            <section className="editorial-card rounded-[28px] p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-plum">{selectedProjectCopy?.boardEyebrow}</p>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">{selectedProjectCopy?.boardTitle}</h3>
                </div>
                <span className="rounded-full border border-ink/10 bg-white/35 px-3 py-2 text-xs uppercase tracking-[0.24em] text-ink/64">
                  {selectedProjectCopy?.planningHint}
                </span>
              </div>

              <div className="mb-6" id="manual-next-unit-form">
                <SceneCreateForm projectId={selectedProject.id} structureMode={selectedProject.structureMode} />
              </div>

              <div className="grid gap-4">
                {selectedProject.scenes.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-ink/15 bg-white/30 p-6 text-sm text-ink/68">
                    {selectedProjectCopy?.emptyState}
                  </div>
                ) : null}

                {selectedProject.scenes.map((scene) => (
                  <article className="rounded-[26px] border border-ink/12 bg-white/40 p-5" key={scene.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-moss">
                            {selectedProjectCopy?.singularTitle} {scene.sequenceNo} / {scene.status}
                          </p>
                          <h4 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-ink">{scene.title}</h4>
                        </div>
                        <p className="text-sm leading-6 text-ink/74">{scene.brief}</p>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-ink/60">
                          <span className="rounded-full border border-ink/10 px-3 py-1">
                            Foco {scene.povCharacter || 'sin definir'}
                          </span>
                          <span className="rounded-full border border-ink/10 px-3 py-1">{scene.location || 'sin localizacion'}</span>
                          <span className="rounded-full border border-ink/10 px-3 py-1">
                            Necesidad {scene.necessityAssessment?.decision || 'pendiente'}
                          </span>
                          <span className="rounded-full border border-ink/10 px-3 py-1">
                            Proxima accion {formatWorkflowMessage(scene.workflow.nextRecommendedAction, unitLabel)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={false}
                          hint={`La prueba de necesidad de la ${selectedProjectCopy?.singular} y las memorias se regeneran aqui.`}
                          label="Planificar"
                          onClick={() => handlePipeline(scene.id, 'plan')}
                          sceneId={scene.id}
                          tone="primary"
                          value="plan"
                        />
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={!scene.workflow.canRunWriting}
                          hint={
                            scene.workflow.canRunWriting
                              ? `Genera el draft de la ${selectedProjectCopy?.singular}.`
                              : scene.workflow.blockers.map((blocker) => formatWorkflowMessage(blocker, unitLabel)).join(' ')
                          }
                          label="Redactar"
                          onClick={() => handlePipeline(scene.id, 'write')}
                          sceneId={scene.id}
                          value="write"
                        />
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={!scene.workflow.canRewriteFromAudits}
                          hint={
                            scene.workflow.canRewriteFromAudits
                              ? `Genera una propuesta revisada de la ${selectedProjectCopy?.singular} sin pisar el draft actual.`
                              : 'Necesitas un draft y observaciones de auditoria para reescribir con apoyo de IA.'
                          }
                          label="Aplicar mejoras"
                          onClick={() => handlePipeline(scene.id, 'rewrite')}
                          sceneId={scene.id}
                          value="rewrite"
                          tone="primary"
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
                          onClick={() => handlePipeline(scene.id, 'technical')}
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
                          onClick={() => handlePipeline(scene.id, 'literary')}
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
                          onClick={() => handlePipeline(scene.id, 'adversarial')}
                          sceneId={scene.id}
                          value="adversarial"
                        />
                      </div>
                    </div>

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
                          <p className="mt-3 text-sm text-ink/58">{selectedProjectCopy?.planningEmpty}</p>
                        )}
                      </section>

                      <section className="rounded-[22px] border border-ink/10 bg-[#fffdf9]/70 p-4">
                        <p className="text-xs uppercase tracking-[0.26em] text-brass">Draft</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/76">
                          {scene.draftMarkdown || selectedProjectCopy?.draftEmpty}
                        </p>
                      </section>

                      <SceneWorkflowPanel unitLabel={unitLabel} workflow={scene.workflow} />
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                      <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
                        <p className="text-xs uppercase tracking-[0.26em] text-moss">{selectedProjectCopy?.necessityLabel}</p>
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

                      <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.26em] text-moss">{selectedProjectCopy?.approvalLabel}</p>
                          <span className="rounded-full border border-ink/10 px-2 py-1 text-xs uppercase tracking-[0.18em] text-ink/66">
                            {getApprovalDecisionLabel(scene.workflow.latestSceneApprovalDecision)}
                          </span>
                        </div>
                        <div className="mt-3">
                          <ApprovalComposer
                            disabled={!scene.workflow.canApproveScene}
                            initialNotes="Lista para revision global."
                            onSubmit={(input) => handleSceneApproval(scene.id, input)}
                            submitLabel={`Registrar aprobacion de ${selectedProjectCopy?.singular}`}
                          />
                        </div>
                        {!scene.workflow.canApproveScene && scene.workflow.blockers.length > 0 ? (
                          <div className="mt-3 rounded-[18px] border border-red-900/10 bg-red-50/60 p-3 text-sm text-red-900">
                            <p>Para aprobar esta {selectedProjectCopy?.singular} aun falta:</p>
                            <ul className="mt-2 list-disc space-y-1 pl-4">
                              {scene.workflow.blockers.map((blocker) => (
                                <li key={blocker}>{formatWorkflowMessage(blocker, unitLabel)}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </section>
                    </div>

                    {scene.workflow.latestSceneApprovalDecision === 'approve' ? (
                      <section className="mt-5 rounded-[22px] border border-emerald-800/12 bg-emerald-50/60 p-4 text-sm text-emerald-950">
                        <p>
                          Esta {selectedProjectCopy?.singular} ya esta cerrada y entra al canon del proyecto. Ahora puedes crear manualmente la siguiente{' '}
                          {selectedProjectCopy?.singular}, dejar que el sistema la proponga, revisar memorias confirmadas o exportar.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a className="action-button" href="#manual-next-unit-form">
                            Crear siguiente manualmente
                          </a>
                          <button
                            className="action-button action-button--primary"
                            disabled={busyKey === `scene:${scene.id}:continue:plan-only` || !scene.workflow.canContinueToNext}
                            onClick={() => handleContinueToNextScene(scene.id, false)}
                            type="button"
                          >
                            {busyKey === `scene:${scene.id}:continue:plan-only`
                              ? 'Proponiendo...'
                              : `Proponer siguiente ${selectedProjectCopy?.singular}`}
                          </button>
                          <button
                            className="action-button"
                            disabled={busyKey === `scene:${scene.id}:continue:with-draft` || !scene.workflow.canContinueToNext}
                            onClick={() => handleContinueToNextScene(scene.id, true)}
                            type="button"
                          >
                            {busyKey === `scene:${scene.id}:continue:with-draft`
                              ? 'Generando draft...'
                              : `Proponer + primer draft`}
                          </button>
                        </div>
                      </section>
                    ) : null}

                    <div className="mt-5">
                      <SceneDraftVersionsPanel
                        busyKey={busyKey}
                        onActivateVersion={handleDraftVersionActivation}
                        scene={scene}
                        structureMode={selectedProject.structureMode}
                      />
                    </div>

                    <div className="mt-5 grid gap-3">
                      <p className="text-xs uppercase tracking-[0.26em] text-moss">Auditorias separadas</p>
                      {scene.audits.length === 0 ? (
                        <p className="rounded-[18px] border border-dashed border-ink/12 bg-white/45 p-4 text-sm text-ink/58">
                          Aun no se ejecutaron auditorias.
                        </p>
                      ) : null}

                      {scene.audits.map((audit) => (
                        <AuditCard
                          audit={audit}
                          key={audit.id}
                          onSubmitApproval={(input) => handleAuditApproval(audit.id, input)}
                        />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="editorial-card rounded-[28px] p-8">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <p className="text-xs uppercase tracking-[0.34em] text-plum">MVP</p>
              <h2 className="font-[family-name:var(--font-display)] text-4xl text-ink">Selecciona un proyecto para abrir la mesa editorial.</h2>
              <p className="text-sm leading-6 text-ink/72">
                El flujo minimo ya soporta proyecto, unidades de trabajo, memoria factual y dramatica, auditorias separadas,
                aprobacion humana y export legible.
              </p>
            </div>
          </section>
        )}
      </div>
    </section>
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
