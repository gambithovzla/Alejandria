export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="editorial-card overflow-hidden rounded-[28px] p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.36em] text-brass">NovelEngine / Editorial studio</p>
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none text-ink md:text-6xl">
                  Planificar, escribir y auditar novelas largas con memoria estructurada.
                </h1>
                <p className="max-w-3xl text-sm text-ink/74 md:text-base">
                  El MVP separa calidad tecnica de calidad literaria, obliga Scene Necessity Test por escena y deja toda
                  aprobacion en manos humanas.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-ink/10 bg-white/35 p-4 text-sm text-ink/78">
              <p>No es un chatbot. Es una mesa editorial operativa.</p>
              <p>Memoria factual y dramatica viven en estructuras persistentes.</p>
              <p>Las salidas del motor se validan con schemas estrictos antes de tocar estado.</p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </main>
  )
}
