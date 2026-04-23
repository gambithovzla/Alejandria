'use client'

import { useEffect, useState } from 'react'

import type { SceneSummary, StructureMode } from '@novel-engine/contracts'

import { getProjectStructureCopy } from '@/lib/project-structure'

interface SceneDraftVersionsPanelProps {
  busyKey: string | null
  onActivateVersion: (sceneId: string, versionId: string) => Promise<void>
  scene: SceneSummary
  structureMode: StructureMode
}

export function SceneDraftVersionsPanel({
  busyKey,
  onActivateVersion,
  scene,
  structureMode,
}: SceneDraftVersionsPanelProps) {
  const copy = getProjectStructureCopy(structureMode)
  const versions = scene.draftVersions
  const activeVersion = versions.find((version) => version.isActive) ?? null
  const fallbackVersion = versions[0] ?? null
  const defaultSelectedId = versions.find((version) => !version.isActive)?.id ?? activeVersion?.id ?? fallbackVersion?.id ?? null
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(defaultSelectedId)

  useEffect(() => {
    setSelectedVersionId(defaultSelectedId)
  }, [defaultSelectedId])

  if (versions.length === 0) {
    return null
  }

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? fallbackVersion
  const compareVersion = selectedVersion && activeVersion && selectedVersion.id !== activeVersion.id ? selectedVersion : null
  const activateKey = compareVersion ? `scene:${scene.id}:activate:${compareVersion.id}` : null

  return (
    <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-moss">Versiones de draft</p>
          <p className="mt-2 text-sm text-ink/72">
            La IA propone revisiones sin pisar el borrador actual. Puedes comparar antes y despues y decidir que version conservar.
          </p>
        </div>
        {compareVersion ? (
          <button
            className="action-button action-button--primary"
            disabled={busyKey === activateKey}
            onClick={() => onActivateVersion(scene.id, compareVersion.id)}
            type="button"
          >
            {busyKey === activateKey ? 'Activando...' : 'Usar version revisada'}
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {versions.map((version) => {
          const isSelected = version.id === selectedVersion?.id
          return (
            <button
              className={`rounded-full border px-3 py-2 text-left text-xs uppercase tracking-[0.18em] transition ${
                isSelected ? 'border-brass bg-brass/10 text-ink' : 'border-ink/10 bg-white/50 text-ink/68'
              }`}
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              type="button"
            >
              v{version.versionNo} {version.isActive ? 'actual' : 'propuesta'}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <VersionCard
          description={`Version activa de la ${copy.singular}.`}
          title={activeVersion ? `Version ${activeVersion.versionNo}` : 'Draft actual'}
          version={activeVersion ?? fallbackVersion}
        />
        <VersionCard
          description={compareVersion ? 'Propuesta generada desde auditorias.' : 'Selecciona una propuesta para compararla con el draft actual.'}
          title={compareVersion ? `Version ${compareVersion.versionNo}` : 'Sin propuesta seleccionada'}
          version={compareVersion}
        />
      </div>
    </section>
  )
}

function VersionCard({
  title,
  description,
  version,
}: {
  title: string
  description: string
  version: SceneSummary['draftVersions'][number] | null
}) {
  return (
    <article className="min-w-0 rounded-[18px] border border-ink/10 bg-[#fffdf9]/75 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-brass">{description}</p>
          <p className="mt-2 font-semibold text-ink">{title}</p>
        </div>
        {version ? (
          <span className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.18em] ${version.isActive ? 'border-emerald-700/20 bg-emerald-700/10 text-emerald-900' : 'border-amber-700/20 bg-amber-700/10 text-amber-900'}`}>
            {version.isActive ? 'Activa' : 'Propuesta'}
          </span>
        ) : null}
      </div>

      {version ? (
        <>
          <div className="mt-3 grid gap-2 text-sm text-ink/68">
            <p>Fuente: {version.sourceLabel}</p>
            <p>Fecha: {formatVersionDate(version.createdAt)}</p>
            {version.editorialRationale ? <p>{version.editorialRationale}</p> : null}
          </div>

          {version.changeSummary.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-ink/72">
              {version.changeSummary.map((item) => (
                <li key={`${version.id}-${item}`}>{item}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 rounded-[16px] border border-ink/10 bg-white/55 p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink/76">{version.draftMarkdown}</p>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink/58">Todavia no hay una version alternativa para comparar.</p>
      )}
    </article>
  )
}

function formatVersionDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
