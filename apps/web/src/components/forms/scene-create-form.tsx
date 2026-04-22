'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

import type { StructureMode } from '@novel-engine/contracts'

import { createScene } from '@/lib/api'
import { getProjectStructureCopy } from '@/lib/project-structure'

const initialState = {
  title: '',
  purpose: '',
  brief: '',
  povCharacter: '',
  location: '',
}

export function SceneCreateForm({ projectId, structureMode }: { projectId: string; structureMode: StructureMode }) {
  const router = useRouter()
  const [form, setForm] = useState(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = getProjectStructureCopy(structureMode)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await createScene(projectId, form)
      setForm(initialState)
      startTransition(() => {
        router.refresh()
      })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : `No se pudo crear la ${copy.singular}.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label={copy.titleLabel}
          className="field"
          placeholder={copy.titlePlaceholder}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <input
          aria-label={copy.focusLabel}
          className="field"
          placeholder={copy.focusPlaceholder}
          value={form.povCharacter}
          onChange={(event) => setForm((current) => ({ ...current, povCharacter: event.target.value }))}
        />
      </div>

      <input
        aria-label={copy.purposeLabel}
        className="field"
        placeholder={copy.purposePlaceholder}
        value={form.purpose}
        onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
        required
      />

      <textarea
        aria-label={copy.briefLabel}
        className="field min-h-24"
        placeholder={copy.briefPlaceholder}
        value={form.brief}
        onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
        required
      />

      <input
        aria-label={copy.locationLabel}
        className="field"
        placeholder={copy.locationPlaceholder}
        value={form.location}
        onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex justify-end">
        <button className="action-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Guardando...' : copy.creationButton}
        </button>
      </div>
    </form>
  )
}
