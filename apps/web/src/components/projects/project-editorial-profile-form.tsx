'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { ProjectDetail } from '@novel-engine/contracts'

import { updateProject } from '@/lib/api'
import { getRecommendedStructureMode, STRUCTURE_MODE_OPTIONS, WORK_TYPE_OPTIONS } from '@/lib/project-structure'

type AntiPatternDraft = {
  label: string
  description: string
  warningSignsText: string
}

type ProjectFormState = {
  title: string
  premise: string
  workType: ProjectDetail['workType']
  structureMode: ProjectDetail['structureMode']
  genre: string
  audience: string
  theme: string
  narrativePov: string
  tense: string
  targetLengthWords: string
  styleDna: {
    voiceReference: string
    sentenceProfile: string
    dialogueProfile: string
    sensoryProfile: string
    forbiddenMovesText: string
  }
  editorialJudgment: {
    northStar: string
    commercialIntent: string
    prioritiesText: string
    nonNegotiablesText: string
    riskTolerance: ProjectDetail['editorialJudgment']['riskTolerance']
  }
  antiPatterns: AntiPatternDraft[]
}

function listToText(values: string[]) {
  return values.join('\n')
}

function textToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildFormState(project: ProjectDetail): ProjectFormState {
  return {
    title: project.title,
    premise: project.premise,
    workType: project.workType,
    structureMode: project.structureMode,
    genre: project.genre,
    audience: project.audience,
    theme: project.theme ?? '',
    narrativePov: project.narrativePov ?? '',
    tense: project.tense ?? '',
    targetLengthWords: project.targetLengthWords ? String(project.targetLengthWords) : '',
    styleDna: {
      voiceReference: project.styleDna.voiceReference,
      sentenceProfile: project.styleDna.sentenceProfile,
      dialogueProfile: project.styleDna.dialogueProfile,
      sensoryProfile: project.styleDna.sensoryProfile,
      forbiddenMovesText: listToText(project.styleDna.forbiddenMoves),
    },
    editorialJudgment: {
      northStar: project.editorialJudgment.northStar,
      commercialIntent: project.editorialJudgment.commercialIntent,
      prioritiesText: listToText(project.editorialJudgment.priorities),
      nonNegotiablesText: listToText(project.editorialJudgment.nonNegotiables),
      riskTolerance: project.editorialJudgment.riskTolerance,
    },
    antiPatterns: project.antiPatterns.map((pattern) => ({
      label: pattern.label,
      description: pattern.description,
      warningSignsText: listToText(pattern.warningSigns),
    })),
  }
}

export function ProjectEditorialProfileForm({ project }: { project: ProjectDetail }) {
  const router = useRouter()
  const [form, setForm] = useState<ProjectFormState>(() => buildFormState(project))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(buildFormState(project))
    setMessage(null)
    setError(null)
  }, [project])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      await updateProject(project.id, {
        title: form.title,
        premise: form.premise,
        workType: form.workType,
        structureMode: form.structureMode,
        genre: form.genre,
        audience: form.audience,
        theme: form.theme.trim() || null,
        narrativePov: form.narrativePov.trim() || null,
        tense: form.tense.trim() || null,
        targetLengthWords: form.targetLengthWords.trim() ? Number(form.targetLengthWords) : null,
        styleDna: {
          voiceReference: form.styleDna.voiceReference,
          sentenceProfile: form.styleDna.sentenceProfile,
          dialogueProfile: form.styleDna.dialogueProfile,
          sensoryProfile: form.styleDna.sensoryProfile,
          forbiddenMoves: textToList(form.styleDna.forbiddenMovesText),
        },
        editorialJudgment: {
          northStar: form.editorialJudgment.northStar,
          commercialIntent: form.editorialJudgment.commercialIntent,
          priorities: textToList(form.editorialJudgment.prioritiesText),
          nonNegotiables: textToList(form.editorialJudgment.nonNegotiablesText),
          riskTolerance: form.editorialJudgment.riskTolerance,
        },
        antiPatterns: form.antiPatterns
          .map((pattern) => ({
            label: pattern.label.trim(),
            description: pattern.description.trim(),
            warningSigns: textToList(pattern.warningSignsText),
          }))
          .filter((pattern) => pattern.label && pattern.description),
      })
      setMessage('Perfil editorial actualizado.')
      router.refresh()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No se pudo actualizar el proyecto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label="Titulo del proyecto"
          className="field"
          placeholder="Titulo del proyecto"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
        <input
          aria-label="Genero"
          className="field"
          placeholder="Genero"
          value={form.genre}
          onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
          required
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          aria-label="Tipo de libro"
          className="field"
          value={form.workType}
          onChange={(event) => {
            const workType = event.target.value as ProjectDetail['workType']
            setForm((current) => ({
              ...current,
              workType,
              structureMode:
                current.structureMode === getRecommendedStructureMode(current.workType)
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
        <select
          aria-label="Modo estructural"
          className="field"
          value={form.structureMode}
          onChange={(event) =>
            setForm((current) => ({ ...current, structureMode: event.target.value as ProjectDetail['structureMode'] }))
          }
        >
          {STRUCTURE_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        aria-label="Premisa editorial"
        className="field min-h-28"
        placeholder="Premisa editorial"
        value={form.premise}
        onChange={(event) => setForm((current) => ({ ...current, premise: event.target.value }))}
        required
      />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          aria-label="Audiencia"
          className="field"
          placeholder="Audiencia"
          value={form.audience}
          onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
          required
        />
        <input
          aria-label="Longitud objetivo"
          className="field"
          inputMode="numeric"
          placeholder="Longitud objetivo en palabras"
          value={form.targetLengthWords}
          onChange={(event) => setForm((current) => ({ ...current, targetLengthWords: event.target.value }))}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          aria-label="Tema"
          className="field"
          placeholder="Tema"
          value={form.theme}
          onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value }))}
        />
        <input
          aria-label="POV narrativo"
          className="field"
          placeholder="POV narrativo o foco"
          value={form.narrativePov}
          onChange={(event) => setForm((current) => ({ ...current, narrativePov: event.target.value }))}
        />
        <input
          aria-label="Tiempo verbal"
          className="field"
          placeholder="Tiempo verbal o registro"
          value={form.tense}
          onChange={(event) => setForm((current) => ({ ...current, tense: event.target.value }))}
        />
      </div>

      <div className="grid gap-3 rounded-[24px] border border-ink/10 bg-white/40 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brass">Style DNA</p>
          <p className="mt-1 text-sm text-ink/68">Una idea por linea ayuda a que el sistema sea mas consistente.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <textarea
            aria-label="Referencia de voz"
            className="field min-h-24"
            placeholder="Referencia de voz"
            value={form.styleDna.voiceReference}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                styleDna: { ...current.styleDna, voiceReference: event.target.value },
              }))
            }
            required
          />
          <textarea
            aria-label="Perfil de frase"
            className="field min-h-24"
            placeholder="Perfil de frase"
            value={form.styleDna.sentenceProfile}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                styleDna: { ...current.styleDna, sentenceProfile: event.target.value },
              }))
            }
            required
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <textarea
            aria-label="Perfil de dialogo"
            className="field min-h-24"
            placeholder="Perfil de dialogo o intercambio"
            value={form.styleDna.dialogueProfile}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                styleDna: { ...current.styleDna, dialogueProfile: event.target.value },
              }))
            }
            required
          />
          <textarea
            aria-label="Perfil sensorial"
            className="field min-h-24"
            placeholder="Perfil sensorial"
            value={form.styleDna.sensoryProfile}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                styleDna: { ...current.styleDna, sensoryProfile: event.target.value },
              }))
            }
            required
          />
        </div>
        <textarea
          aria-label="Movimientos prohibidos"
          className="field min-h-24"
          placeholder="Movimientos prohibidos, uno por linea"
          value={form.styleDna.forbiddenMovesText}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              styleDna: { ...current.styleDna, forbiddenMovesText: event.target.value },
            }))
          }
          required
        />
      </div>

      <div className="grid gap-3 rounded-[24px] border border-ink/10 bg-white/40 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brass">Editorial Judgment</p>
          <p className="mt-1 text-sm text-ink/68">Define el norte y las restricciones que el motor debe obedecer.</p>
        </div>
        <textarea
          aria-label="North Star"
          className="field min-h-24"
          placeholder="North star"
          value={form.editorialJudgment.northStar}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              editorialJudgment: { ...current.editorialJudgment, northStar: event.target.value },
            }))
          }
          required
        />
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_220px]">
          <textarea
            aria-label="Intento comercial"
            className="field min-h-24"
            placeholder="Intento comercial"
            value={form.editorialJudgment.commercialIntent}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                editorialJudgment: { ...current.editorialJudgment, commercialIntent: event.target.value },
              }))
            }
            required
          />
          <textarea
            aria-label="Prioridades"
            className="field min-h-24"
            placeholder="Prioridades, una por linea"
            value={form.editorialJudgment.prioritiesText}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                editorialJudgment: { ...current.editorialJudgment, prioritiesText: event.target.value },
              }))
            }
            required
          />
          <select
            aria-label="Tolerancia al riesgo"
            className="field"
            value={form.editorialJudgment.riskTolerance}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                editorialJudgment: {
                  ...current.editorialJudgment,
                  riskTolerance: event.target.value as ProjectDetail['editorialJudgment']['riskTolerance'],
                },
              }))
            }
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
        <textarea
          aria-label="No negociables"
          className="field min-h-24"
          placeholder="No negociables, uno por linea"
          value={form.editorialJudgment.nonNegotiablesText}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              editorialJudgment: { ...current.editorialJudgment, nonNegotiablesText: event.target.value },
            }))
          }
          required
        />
      </div>

      <div className="grid gap-3 rounded-[24px] border border-ink/10 bg-white/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brass">Anti-patterns</p>
            <p className="mt-1 text-sm text-ink/68">Cada anti-pattern puede tener varias señales de alerta.</p>
          </div>
          <button
            className="action-button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                antiPatterns: [...current.antiPatterns, { label: '', description: '', warningSignsText: '' }],
              }))
            }
            type="button"
          >
            Agregar
          </button>
        </div>

        {form.antiPatterns.map((pattern, index) => (
          <div className="grid gap-3 rounded-[20px] border border-ink/10 bg-[#fffdf9]/80 p-4" key={`anti-pattern-${index}`}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                aria-label={`Anti-pattern ${index + 1}`}
                className="field"
                placeholder="Nombre del anti-pattern"
                value={pattern.label}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    antiPatterns: current.antiPatterns.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item
                    ),
                  }))
                }
              />
              <button
                className="action-button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    antiPatterns: current.antiPatterns.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                type="button"
              >
                Quitar
              </button>
            </div>
            <textarea
              aria-label={`Descripcion del anti-pattern ${index + 1}`}
              className="field min-h-24"
              placeholder="Descripcion"
              value={pattern.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  antiPatterns: current.antiPatterns.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description: event.target.value } : item
                  ),
                }))
              }
            />
            <textarea
              aria-label={`Warning signs ${index + 1}`}
              className="field min-h-24"
              placeholder="Warning signs, una por linea"
              value={pattern.warningSignsText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  antiPatterns: current.antiPatterns.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, warningSignsText: event.target.value } : item
                  ),
                }))
              }
            />
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-moss">{message}</p> : null}

      <div className="flex justify-end">
        <button className="action-button action-button--primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Guardando...' : 'Guardar perfil editorial'}
        </button>
      </div>
    </form>
  )
}
