import type { LLMHealthStatus, PipelineRunSummary } from '@novel-engine/contracts'

interface ProjectLLMConsoleProps {
  runs: PipelineRunSummary[]
  status: LLMHealthStatus | null
}

export function ProjectLLMConsole({ runs, status }: ProjectLLMConsoleProps) {
  const observedRuns = runs.filter((run) => run.llm)
  const fallbackRuns = observedRuns.filter((run) => run.llm?.fallbackUsed)
  const configuredProviders = status ? Object.entries(status.providers).filter(([, value]) => value.configured).length : 0

  const totals = observedRuns.reduce(
    (acc, run) => {
      acc.inputTokens += run.llm?.usage?.inputTokens ?? 0
      acc.outputTokens += run.llm?.usage?.outputTokens ?? 0
      acc.totalTokens += run.llm?.usage?.totalTokens ?? 0
      acc.costUsd += run.llm?.usage?.estimatedCostUsd ?? 0
      return acc
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 },
  )

  return (
    <section className="editorial-card rounded-[28px] p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-plum">LLM orchestration</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Proveedores y coste</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink/62">
          <span className="rounded-full border border-ink/10 bg-white/40 px-3 py-2">
            modo {status?.mode ?? 'desconocido'}
          </span>
          <span className="rounded-full border border-ink/10 bg-white/40 px-3 py-2">
            fallback {status?.allowMockFallback ? 'activo' : 'cerrado'}
          </span>
          <span className="rounded-full border border-ink/10 bg-white/40 px-3 py-2">
            providers {configuredProviders}/{status ? Object.keys(status.providers).length : 0}
          </span>
        </div>
      </div>

      {!status ? (
        <p className="rounded-[20px] border border-dashed border-ink/12 bg-white/38 p-4 text-sm text-ink/58">
          No se pudo consultar el estado LLM del backend.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-brass">Routing activo</p>
              <span className="text-xs text-ink/58">Definido por `.env`</span>
            </div>
            <div className="grid gap-3">
              {Object.entries(status.routing).map(([pipeline, route]) => (
                <article className="rounded-[18px] border border-ink/10 bg-[#fffdf9]/75 p-3" key={pipeline}>
                  <p className="text-sm font-semibold capitalize text-ink">{pipeline.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-sm text-ink/70">
                    {route.provider}:{route.model}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(status.providers).map(([provider, meta]) => (
                <span
                  className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                    meta.configured ? 'border-moss/25 bg-moss/10 text-moss' : 'border-ink/10 bg-white/45 text-ink/54'
                  }`}
                  key={provider}
                >
                  {provider} {meta.configured ? 'ready' : 'missing key'}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-brass">Uso observado</p>
              <span className="text-xs text-ink/58">Estimado desde `pipeline_runs`</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <MetricCard label="Coste estimado" value={formatUsd(totals.costUsd)} />
              <MetricCard label="Tokens totales" value={formatInteger(totals.totalTokens)} />
              <MetricCard label="Input tokens" value={formatInteger(totals.inputTokens)} />
              <MetricCard label="Output tokens" value={formatInteger(totals.outputTokens)} />
              <MetricCard label="Runs observados" value={formatInteger(observedRuns.length)} />
              <MetricCard label="Fallback a mock" value={formatInteger(fallbackRuns.length)} />
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/64">
              El coste es una estimacion local basada en la tabla de precios integrada. Si el proveedor no devuelve usage,
              esa ejecucion no suma tokens ni costo.
            </p>
          </section>
        </div>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-ink/10 bg-[#fffdf9]/75 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-ink/52">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('es-PE').format(value)
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
  }).format(value)
}
