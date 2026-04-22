'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

import { createScene } from '@/lib/api'

const initialState = {
  title: '',
  purpose: '',
  brief: '',
  povCharacter: '',
  location: '',
}

export function SceneCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [form, setForm] = useState(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setError(submissionError instanceof Error ? submissionError.message : 'No se pudo crear la escena.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label="Titulo de escena"
          className="field"
          placeholder="Titulo de escena"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <input
          aria-label="Personaje POV"
          className="field"
          placeholder="POV"
          value={form.povCharacter}
          onChange={(event) => setForm((current) => ({ ...current, povCharacter: event.target.value }))}
        />
      </div>

      <input
        aria-label="Proposito editorial"
        className="field"
        placeholder="Proposito editorial de la escena"
        value={form.purpose}
        onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
        required
      />

      <textarea
        aria-label="Brief de la escena"
        className="field min-h-24"
        placeholder="Brief de la escena"
        value={form.brief}
        onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
        required
      />

      <input
        aria-label="Localizacion"
        className="field"
        placeholder="Localizacion"
        value={form.location}
        onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex justify-end">
        <button className="action-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Guardando...' : 'Agregar escena'}
        </button>
      </div>
    </form>
  )
}
