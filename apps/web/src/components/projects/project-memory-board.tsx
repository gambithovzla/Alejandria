'use client'

import type { MemoryItem, MemoryStatus } from '@novel-engine/contracts'

interface ProjectMemoryBoardProps {
  busyKey: string | null
  memories: MemoryItem[]
  onUpdate: (memoryId: string, status: MemoryStatus, notes: string | null) => void
}

export function ProjectMemoryBoard({ busyKey, memories, onUpdate }: ProjectMemoryBoardProps) {
  const factualMemories = memories.filter((memory) => memory.kind === 'factual')
  const dramaticMemories = memories.filter((memory) => memory.kind === 'dramatic')

  return (
    <section className="editorial-card rounded-[28px] p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-moss">Memory ledger</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Memoria estructurada</h3>
        </div>
        <span className="rounded-full border border-ink/10 bg-white/40 px-3 py-2 text-xs uppercase tracking-[0.22em] text-ink/66">
          factual + dramatic
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MemoryColumn
          busyKey={busyKey}
          memories={factualMemories}
          kindLabel="Memoria factual"
          onUpdate={onUpdate}
        />
        <MemoryColumn
          busyKey={busyKey}
          memories={dramaticMemories}
          kindLabel="Memoria dramatica"
          onUpdate={onUpdate}
        />
      </div>
    </section>
  )
}

function MemoryColumn({
  busyKey,
  kindLabel,
  memories,
  onUpdate,
}: {
  busyKey: string | null
  kindLabel: string
  memories: MemoryItem[]
  onUpdate: (memoryId: string, status: MemoryStatus, notes: string | null) => void
}) {
  return (
    <section className="rounded-[24px] border border-ink/10 bg-white/42 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-brass">{kindLabel}</p>
      <div className="mt-4 grid gap-3">
        {memories.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-ink/12 bg-white/45 p-4 text-sm text-ink/58">
            Aun no hay memorias de este tipo.
          </p>
        ) : null}

        {memories.map((memory) => {
          const confirmKey = `memory:${memory.id}:confirmed`
          const retireKey = `memory:${memory.id}:retired`
          return (
            <article className="rounded-[18px] border border-ink/10 bg-[#fffdf9]/75 p-4" key={memory.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{memory.key}</p>
                  <p className="mt-1 text-sm leading-6 text-ink/74">{memory.statement}</p>
                </div>
                <StatusBadge status={memory.status} />
              </div>

              <div className="mt-3 grid gap-1 text-sm text-ink/62">
                {memory.notes ? <p>{memory.notes}</p> : null}
                {memory.sourceSceneId ? <p>Origen: {memory.sourceSceneId}</p> : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="action-button"
                  disabled={memory.status === 'confirmed' || busyKey === confirmKey}
                  onClick={() => onUpdate(memory.id, 'confirmed', memory.notes)}
                  type="button"
                >
                  {busyKey === confirmKey ? 'Actualizando...' : 'Confirmar'}
                </button>
                <button
                  className="action-button"
                  disabled={memory.status === 'retired' || busyKey === retireKey}
                  onClick={() => onUpdate(memory.id, 'retired', memory.notes)}
                  type="button"
                >
                  {busyKey === retireKey ? 'Actualizando...' : 'Retirar'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function StatusBadge({ status }: { status: MemoryStatus }) {
  const palette =
    status === 'confirmed'
      ? 'border-emerald-700/20 bg-emerald-700/10 text-emerald-900'
      : status === 'retired'
        ? 'border-red-700/15 bg-red-700/10 text-red-900'
        : 'border-amber-700/15 bg-amber-700/10 text-amber-900'

  return <span className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.18em] ${palette}`}>{status}</span>
}
