'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

import type { StructureMode, WorkType } from '@novel-engine/contracts'

import { createProject } from '@/lib/api'
import { getRecommendedStructureMode, STRUCTURE_MODE_OPTIONS, WORK_TYPE_OPTIONS } from '@/lib/project-structure'

type ProjectCreateState = {
  title: string
  premise: string
  workType: WorkType
  structureMode: StructureMode
  genre: string
  audience: string
}

const initialState: ProjectCreateState = {
  title: '',
  premise: '',
  workType: 'novel',
  structureMode: 'scene',
  genre: '',
  audience: '',
}

export function ProjectCreateForm() {
  const router = useRouter()
  const [form, setForm] = useState(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const project = await createProject(form)
      setForm(initialState)
      startTransition(() => {
        router.push(`/projects/${project.id}`)
        router.refresh()
      })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No se pudo crear el proyecto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label="Titulo del proyecto"
          className="field"
          placeholder="Titulo del proyecto"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <select
          aria-label="Tipo de libro"
          className="field"
          value={form.workType}
          onChange={(event) => {
            const workType = event.target.value as typeof form.workType
            setForm((current) => ({
              ...current,
              workType,
              structureMode: current.structureMode === getRecommendedStructureMode(current.workType)
                ? getRecommendedStructureMode(workType)
                : current.structureMode,
            }))
          }}
        >
          {WORK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label="Genero literario"
          className="field"
          placeholder="Genero"
          value={form.genre}
          onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
          required
        />
        <select
          aria-label="Modo estructural"
          className="field"
          value={form.structureMode}
          onChange={(event) =>
            setForm((current) => ({ ...current, structureMode: event.target.value as typeof current.structureMode }))
          }
        >
          {STRUCTURE_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr]">
        <textarea
          aria-label="Premisa editorial"
          className="field min-h-28"
          placeholder="Premisa editorial"
          value={form.premise}
          onChange={(event) => setForm((current) => ({ ...current, premise: event.target.value }))}
          required
        />
        <input
          aria-label="Audiencia objetivo"
          className="field"
          placeholder="Audiencia"
          value={form.audience}
          onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
          required
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex justify-end">
        <button className="action-button action-button--primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creando...' : 'Crear proyecto'}
        </button>
      </div>
    </form>
  )
}
