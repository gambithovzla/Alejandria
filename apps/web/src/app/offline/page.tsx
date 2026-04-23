import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <section className="editorial-card rounded-[32px] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.32em] text-brass">Modo offline</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none text-ink md:text-5xl">
            La app no puede conectarse ahora mismo.
          </h1>
          <p className="mt-4 text-base leading-7 text-ink/72">
            Si ya abriste antes una pagina del lector, la PWA intentara servirla desde cache. Cuando vuelvas a tener internet,
            recarga la aplicacion para sincronizar de nuevo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="action-button action-button--primary" href="/">
              Ir al inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
