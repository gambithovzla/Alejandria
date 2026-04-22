'use client'

import { useState } from 'react'

import type { ApprovalDecision } from '@novel-engine/contracts'

interface ApprovalComposerProps {
  disabled?: boolean
  initialDecision?: ApprovalDecision
  initialNotes?: string
  initialReviewer?: string
  onSubmit: (input: { reviewer: string; notes: string; decision: ApprovalDecision }) => Promise<void>
  submitLabel: string
}

export function ApprovalComposer({
  disabled = false,
  initialDecision = 'approve',
  initialNotes = '',
  initialReviewer = 'Editor principal',
  onSubmit,
  submitLabel,
}: ApprovalComposerProps) {
  const [reviewer, setReviewer] = useState(initialReviewer)
  const [notes, setNotes] = useState(initialNotes)
  const [decision, setDecision] = useState<ApprovalDecision>(initialDecision)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({ reviewer, notes, decision })
      setNotes(initialNotes)
      setDecision(initialDecision)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No se pudo registrar la decision editorial.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label="Reviewer"
          className="field"
          disabled={disabled || isSubmitting}
          placeholder="Reviewer"
          value={reviewer}
          onChange={(event) => setReviewer(event.target.value)}
        />
        <select
          aria-label="Decision editorial"
          className="field"
          disabled={disabled || isSubmitting}
          value={decision}
          onChange={(event) => setDecision(event.target.value as ApprovalDecision)}
        >
          <option value="approve">Approve</option>
          <option value="request_changes">Request changes</option>
          <option value="reject">Reject</option>
        </select>
      </div>

      <textarea
        aria-label="Notas editoriales"
        className="field min-h-20"
        disabled={disabled || isSubmitting}
        placeholder="Notas editoriales"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex justify-end">
        <button className="action-button" disabled={disabled || isSubmitting} type="submit">
          {isSubmitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
