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
import { createAuditApproval, createSceneApproval, getExportUrl, runAudit, runScenePlanning, runSceneWriting, updateMemory } from '@/lib/api'
import { ApprovalComposer } from '@/components/projects/approval-composer'
import { ProjectLLMConsole } from '@/components/projects/project-llm-console'
import { ProjectMemoryBoard } from '@/components/projects/project-memory-board'
import { ProjectPipelineTimeline } from '@/components/projects/project-pipeline-timeline'
import { SceneWorkflowPanel } from '@/components/projects/scene-workflow-panel'

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

  async function handlePipeline(sceneId: string, action: 'plan' | 'write' | AuditType) {
    const key = `${sceneId}:${action}`
    setBusyKey(key)
    setFeedback(null)

    try {
      if (action === 'plan') {
        await runScenePlanning(sceneId)
      } else if (action === 'write') {
        await runSceneWriting(sceneId)
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
                      <p className="mt-1 text-sm text-ink/68">{project.genre}</p>
                    </div>
                    <span className="rounded-full border border-ink/10 px-2 py-1 text-xs text-ink/68">
                      {project.sceneCount} escenas
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
                    <p>Escenas activas: {selectedProject.scenes.length}</p>
                    <p>Runs registrados: {pipelineRuns.length}</p>
                    <p>Sin score unico: las auditorias permanecen separadas.</p>
                  </div>
                </div>
              </div>
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
                  <p className="text-xs uppercase tracking-[0.28em] text-plum">Scene planning board</p>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Escenas</h3>
                </div>
                <span className="rounded-full border border-ink/10 bg-white/35 px-3 py-2 text-xs uppercase tracking-[0.24em] text-ink/64">
                  Scene Necessity Test obligatorio
                </span>
              </div>

              <div className="mb-6">
                <SceneCreateForm projectId={selectedProject.id} />
              </div>

              <div className="grid gap-4">
                {selectedProject.scenes.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-ink/15 bg-white/30 p-6 text-sm text-ink/68">
                    No hay escenas aun. El flujo MVP empieza creando una escena y luego corriendo planning, writing y auditorias.
                  </div>
                ) : null}

                {selectedProject.scenes.map((scene) => (
                  <article className="rounded-[26px] border border-ink/12 bg-white/40 p-5" key={scene.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-moss">
                            Escena {scene.sequenceNo} / {scene.status}
                          </p>
                          <h4 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-ink">{scene.title}</h4>
                        </div>
                        <p className="text-sm leading-6 text-ink/74">{scene.brief}</p>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-ink/60">
                          <span className="rounded-full border border-ink/10 px-3 py-1">POV {scene.povCharacter || 'sin definir'}</span>
                          <span className="rounded-full border border-ink/10 px-3 py-1">{scene.location || 'sin localizacion'}</span>
                          <span className="rounded-full border border-ink/10 px-3 py-1">
                            Necesidad {scene.necessityAssessment?.decision || 'pendiente'}
                          </span>
                          <span className="rounded-full border border-ink/10 px-3 py-1">
                            Proxima accion {scene.workflow.nextRecommendedAction}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={false}
                          hint="Scene Necessity Test y memorias se regeneran aqui."
                          label="Planificar"
                          onClick={() => handlePipeline(scene.id, 'plan')}
                          sceneId={scene.id}
                          tone="primary"
                          value="plan"
                        />
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={!scene.workflow.canRunWriting}
                          hint={scene.workflow.canRunWriting ? 'Genera el draft de escena.' : scene.workflow.blockers.join(' ')}
                          label="Redactar"
                          onClick={() => handlePipeline(scene.id, 'write')}
                          sceneId={scene.id}
                          value="write"
                        />
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={!scene.workflow.canRunTechnicalAudit}
                          hint={scene.workflow.canRunTechnicalAudit ? 'Auditoria de continuidad y causalidad.' : scene.workflow.blockers.join(' ')}
                          label="Audit tecnico"
                          onClick={() => handlePipeline(scene.id, 'technical')}
                          sceneId={scene.id}
                          value="technical"
                        />
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={!scene.workflow.canRunLiteraryAudit}
                          hint={scene.workflow.canRunLiteraryAudit ? 'Auditoria de voz, tension y subtexto.' : scene.workflow.blockers.join(' ')}
                          label="Audit literario"
                          onClick={() => handlePipeline(scene.id, 'literary')}
                          sceneId={scene.id}
                          value="literary"
                        />
                        <PipelineButton
                          busyKey={busyKey}
                          disabled={!scene.workflow.canRunAdversarialAudit}
                          hint={
                            scene.workflow.canRunAdversarialAudit ? 'Red team editorial.' : scene.workflow.blockers.join(' ')
                          }
                          label="Audit adversarial"
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
                          <p className="mt-3 text-sm text-ink/58">Todavia no hay plan validado.</p>
                        )}
                      </section>

                      <section className="rounded-[22px] border border-ink/10 bg-[#fffdf9]/70 p-4">
                        <p className="text-xs uppercase tracking-[0.26em] text-brass">Draft</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/76">
                          {scene.draftMarkdown || 'Todavia no hay draft de escena.'}
                        </p>
                      </section>

                      <SceneWorkflowPanel workflow={scene.workflow} />
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                      <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
                        <p className="text-xs uppercase tracking-[0.26em] text-moss">Scene Necessity Test</p>
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
                          <p className="text-xs uppercase tracking-[0.26em] text-moss">Aprobacion de escena</p>
                          <span className="rounded-full border border-ink/10 px-2 py-1 text-xs uppercase tracking-[0.18em] text-ink/66">
                            {scene.workflow.latestSceneApprovalDecision || 'pending'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <ApprovalComposer
                            disabled={!scene.workflow.canApproveScene}
                            initialNotes="Lista para revision global."
                            onSubmit={(input) => handleSceneApproval(scene.id, input)}
                            submitLabel="Registrar aprobacion de escena"
                          />
                        </div>
                      </section>
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
                El flujo minimo ya soporta proyecto, escenas, memoria factual y dramatica, auditorias separadas, aprobacion
                humana y export legible.
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
  return (
    <article className="rounded-[22px] border border-ink/10 bg-white/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold capitalize text-ink">{audit.auditType}</p>
        <span className="rounded-full border border-ink/10 px-2 py-1 text-xs uppercase tracking-[0.18em] text-ink/66">
          {audit.decision}
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
        <p>Human review: {audit.humanReviewRequired ? 'required' : 'optional'}</p>
        <p>Latest approval: {audit.approvals[0]?.decision || 'pending'}</p>
      </div>

      {audit.humanReviewRequired || audit.approvals.length > 0 ? (
        <div className="mt-4">
          <ApprovalComposer
            initialNotes={`Revision humana del audit ${audit.auditType}.`}
            onSubmit={onSubmitApproval}
            submitLabel={`Revisar ${audit.auditType}`}
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
