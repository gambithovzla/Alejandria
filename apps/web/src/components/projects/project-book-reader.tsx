import Link from 'next/link'

import type { ProjectDetail, SceneSummary } from '@novel-engine/contracts'

import { getProjectStructureCopy, getWorkTypeLabel } from '@/lib/project-structure'
import { getBookRoute, getReaderMarkdown } from '@/lib/project-reading'
import { ReaderMarkdown } from '@/components/projects/reader-markdown'

interface ProjectBookReaderProps {
  activeScene: SceneSummary
  approvedScenes: SceneSummary[]
  project: ProjectDetail
}

export function ProjectBookReader({ activeScene, approvedScenes, project }: ProjectBookReaderProps) {
  const projectCopy = getProjectStructureCopy(project.structureMode)
  const activeIndex = approvedScenes.findIndex((scene) => scene.id === activeScene.id)
  const previousScene = activeIndex > 0 ? approvedScenes[activeIndex - 1] : null
  const nextScene = activeIndex < approvedScenes.length - 1 ? approvedScenes[activeIndex + 1] : null
  const readerMarkdown = getReaderMarkdown(activeScene)

  return (
    <main className="min-h-screen px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="editorial-card rounded-[28px] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Link className="inline-flex items-center gap-2 text-sm text-ink/68 transition hover:text-ink" href={`/projects/${project.id}`}>
                <span aria-hidden="true">←</span>
                Volver a la mesa editorial
              </Link>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.32em] text-brass">Modo libro aprobado</p>
                <h1 className="font-[family-name:var(--font-display)] text-4xl leading-none text-ink md:text-5xl">{project.title}</h1>
                <p className="max-w-3xl text-sm leading-6 text-ink/72 md:text-base">{project.premise}</p>
              </div>
            </div>

            <div className="grid gap-2 rounded-[24px] border border-ink/10 bg-white/45 p-4 text-sm text-ink/74">
              <p>{getWorkTypeLabel(project.workType)} / {project.genre}</p>
              <p>{approvedScenes.length} {projectCopy.countLabel} aprobadas en el lector</p>
              <p>Lectura paginada: una {projectCopy.singular} por vista, sin scroll infinito.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="editorial-card hidden rounded-[28px] p-4 lg:block lg:sticky lg:top-5 lg:self-start">
            <p className="text-xs uppercase tracking-[0.28em] text-moss">Indice aprobado</p>
            <div className="mt-4 grid gap-2">
              {approvedScenes.map((scene, index) => {
                const isActive = scene.id === activeScene.id
                return (
                  <Link
                    className={`rounded-[18px] border px-3 py-3 text-sm transition ${
                      isActive ? 'border-brass bg-brass/12 text-ink' : 'border-ink/10 bg-white/40 text-ink/70 hover:bg-white/70'
                    }`}
                    href={getBookRoute(project.id, scene.sequenceNo)}
                    key={scene.id}
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-moss/80">
                      {projectCopy.singularTitle} {index + 1}
                    </p>
                    <p className="mt-1 font-semibold">{scene.title}</p>
                  </Link>
                )
              })}
            </div>
          </aside>

          <section className="grid gap-4">
            <div className="overflow-x-auto rounded-[22px] border border-ink/10 bg-white/35 p-3 lg:hidden">
              <div className="flex gap-2">
                {approvedScenes.map((scene, index) => {
                  const isActive = scene.id === activeScene.id
                  return (
                    <Link
                      className={`shrink-0 rounded-full border px-3 py-2 text-sm transition ${
                        isActive ? 'border-brass bg-brass/12 text-ink' : 'border-ink/10 bg-white/70 text-ink/68'
                      }`}
                      href={getBookRoute(project.id, scene.sequenceNo)}
                      key={scene.id}
                    >
                      {projectCopy.singularTitle} {index + 1}
                    </Link>
                  )
                })}
              </div>
            </div>

            <article className="reader-frame editorial-card rounded-[32px] p-6 md:p-10">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/62">
                  <p className="uppercase tracking-[0.28em] text-moss">
                    {projectCopy.singularTitle} {activeIndex + 1} de {approvedScenes.length}
                  </p>
                  <p>Estado editorial: aprobado</p>
                </div>

                <div className="space-y-3 border-b border-ink/8 pb-6">
                  <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-ink md:text-5xl">{activeScene.title}</h2>
                  <p className="max-w-3xl text-sm leading-6 text-ink/68 md:text-base">{activeScene.purpose}</p>
                </div>

                <ReaderMarkdown markdown={readerMarkdown} />
              </div>
            </article>

            <nav className="reader-nav editorial-card sticky bottom-4 rounded-[22px] p-3 md:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-ink/62">
                  Lectura enfocada para telefono, tablet y escritorio.
                </div>
                <div className="flex gap-2">
                  {previousScene ? (
                    <Link className="action-button" href={getBookRoute(project.id, previousScene.sequenceNo)}>
                      Anterior
                    </Link>
                  ) : (
                    <span className="action-button cursor-default opacity-45">Anterior</span>
                  )}
                  {nextScene ? (
                    <Link className="action-button action-button--primary" href={getBookRoute(project.id, nextScene.sequenceNo)}>
                      Siguiente
                    </Link>
                  ) : (
                    <span className="action-button action-button--primary cursor-default opacity-45">Fin del libro</span>
                  )}
                </div>
              </div>
            </nav>
          </section>
        </div>
      </div>
    </main>
  )
}
