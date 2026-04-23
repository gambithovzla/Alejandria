import type { SceneWorkflowSnapshot } from '@novel-engine/contracts'

export function SceneWorkflowPanel({ workflow }: { workflow: SceneWorkflowSnapshot }) {
  return (
    <section className="rounded-[22px] border border-ink/10 bg-white/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-moss">Siguiente paso editorial</p>
          <p className="mt-2 text-sm text-ink/74">{workflow.nextRecommendedAction}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.18em] ${
            workflow.canApproveScene ? 'border-emerald-700/20 bg-emerald-700/10 text-emerald-900' : 'border-amber-700/20 bg-amber-700/10 text-amber-900'
          }`}
        >
          {workflow.canApproveScene ? 'Lista para cerrar' : 'En trabajo'}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-ink/72">
        <p>Necesidad editorial: {workflow.necessityPassed ? 'validada' : 'pendiente'}</p>
        <p>Reescritura sugerida: {workflow.canRewriteFromAudits ? 'disponible' : 'no disponible'}</p>
        <p>Continuacion guiada: {workflow.canContinueToNext ? 'habilitada' : 'pendiente de cierre editorial'}</p>
        <p>Tecnico: {workflow.technicalAuditDecision || 'pendiente'}</p>
        <p>Literario: {workflow.literaryAuditDecision || 'pendiente'}</p>
        <p>Adversarial: {workflow.adversarialAuditDecision || 'pendiente'}</p>
      </div>

      {workflow.pendingHumanReviews.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-4 text-sm text-ink/72">
          {workflow.pendingHumanReviews.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {workflow.blockers.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-4 text-sm text-red-900">
          {workflow.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
