import type { PipelineRunSummary, SceneSummary } from '@novel-engine/contracts'

interface ProjectPipelineTimelineProps {
  runs: PipelineRunSummary[]
  scenes: SceneSummary[]
}

export function ProjectPipelineTimeline({ runs, scenes }: ProjectPipelineTimelineProps) {
  const sceneMap = new Map(scenes.map((scene) => [scene.id, scene.title]))
  const recentRuns = runs.slice(0, 10)

  return (
    <section className="editorial-card rounded-[28px] p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-plum">Execution trace</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Pipeline timeline</h3>
        </div>
        <span className="rounded-full border border-ink/10 bg-white/40 px-3 py-2 text-xs uppercase tracking-[0.22em] text-ink/66">
          {runs.length} runs
        </span>
      </div>

      <div className="grid gap-3">
        {recentRuns.length === 0 ? (
          <p className="rounded-[20px] border border-dashed border-ink/12 bg-white/38 p-4 text-sm text-ink/58">
            Todavia no hay ejecuciones registradas.
          </p>
        ) : null}

        {recentRuns.map((run) => (
          <article className="rounded-[20px] border border-ink/10 bg-white/45 p-4" key={run.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold capitalize text-ink">{run.pipelineType.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-sm text-ink/68">
                  {run.sceneId ? sceneMap.get(run.sceneId) ?? run.sceneId : 'Nivel proyecto'}
                </p>
                {run.llm ? (
                  <p className="mt-2 text-sm text-ink/62">
                    {run.llm.provider}:{run.llm.model}
                    {run.llm.fallbackUsed ? ' -> mock fallback' : ''}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink/62">
                <span className="rounded-full border border-ink/10 px-2 py-1">{run.status}</span>
                <span className="rounded-full border border-ink/10 px-2 py-1">{formatRunDate(run.createdAt)}</span>
              </div>
            </div>
            {run.llm?.usage ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-ink/58">
                {run.llm.usage.inputTokens !== null ? (
                  <span className="rounded-full border border-ink/10 px-2 py-1">
                    in {formatCompactInteger(run.llm.usage.inputTokens)}
                  </span>
                ) : null}
                {run.llm.usage.outputTokens !== null ? (
                  <span className="rounded-full border border-ink/10 px-2 py-1">
                    out {formatCompactInteger(run.llm.usage.outputTokens)}
                  </span>
                ) : null}
                {run.llm.usage.estimatedCostUsd !== null ? (
                  <span className="rounded-full border border-ink/10 px-2 py-1">{formatUsd(run.llm.usage.estimatedCostUsd)}</span>
                ) : null}
              </div>
            ) : null}
            {run.errorMessage ? <p className="mt-3 text-sm text-red-800">{run.errorMessage}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function formatRunDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatCompactInteger(value: number) {
  return new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
  }).format(value)
}
