import type { ApprovalDecision, AuditDecision, AuditType } from '@novel-engine/contracts'

const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  technical: 'continuidad',
  literary: 'voz',
  adversarial: 'friccion',
}

const AUDIT_DECISION_LABELS: Record<AuditDecision, string> = {
  pass: 'aprobado',
  pass_with_notes: 'aprobado con notas',
  needs_revision: 'requiere revision',
  blocked: 'bloqueado',
}

const APPROVAL_DECISION_LABELS: Record<ApprovalDecision, string> = {
  approve: 'aprobada',
  request_changes: 'cambios solicitados',
  reject: 'rechazada',
}

function normalizeAuditType(value: string): AuditType | null {
  const normalized = value.trim().toLowerCase().replace(/ /g, '_')
  if (normalized === 'technical' || normalized === 'literary' || normalized === 'adversarial') {
    return normalized
  }
  return null
}

function normalizeAuditDecision(value: string): AuditDecision | null {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'pass' || normalized === 'pass_with_notes' || normalized === 'needs_revision' || normalized === 'blocked') {
    return normalized
  }
  return null
}

export function getAuditTypeLabel(value: string): string {
  const normalized = normalizeAuditType(value)
  return normalized ? AUDIT_TYPE_LABELS[normalized] : value
}

export function getAuditDecisionLabel(value: AuditDecision | null | undefined): string {
  if (!value) {
    return 'pendiente'
  }
  return AUDIT_DECISION_LABELS[value]
}

export function getApprovalDecisionLabel(value: ApprovalDecision | null | undefined): string {
  if (!value) {
    return 'pendiente'
  }
  return APPROVAL_DECISION_LABELS[value]
}

export function formatWorkflowMessage(message: string, unitLabel: string): string {
  if (!message) {
    return message
  }

  if (/^Run [a-z]+ planning before writing or auditing the [a-z]+\.$/i.test(message)) {
    return `Corre primero la planificacion de ${unitLabel} antes de redactar o auditar.`
  }

  if (/^The [a-z]+ Necessity Test returned rework\./i.test(message)) {
    return `La prueba de necesidad devolvio rework. Ajusta el brief y vuelve a planificar ${unitLabel}.`
  }

  if (/^The [a-z]+ Necessity Test returned cut\./i.test(message)) {
    return `La prueba de necesidad devolvio cut. No avances ${unitLabel} sin cambios estructurales.`
  }

  if (/^Generate or upload a [a-z]+ draft before audits and approvals\.$/i.test(message)) {
    return 'Genera o carga un draft antes de correr auditorias o aprobar.'
  }

  const auditReturnedMatch = message.match(/^The ([a-z_ ]+) audit returned ([a-z_]+)\.$/i)
  if (auditReturnedMatch) {
    const auditType = getAuditTypeLabel(auditReturnedMatch[1])
    const decision = normalizeAuditDecision(auditReturnedMatch[2])
    return `La auditoria de ${auditType} devolvio ${decision ? AUDIT_DECISION_LABELS[decision] : auditReturnedMatch[2]}.`
  }

  const runAuditMatch = message.match(/^Run the ([a-z_ ]+) audit\.$/i)
  if (runAuditMatch) {
    return `Corre la auditoria de ${getAuditTypeLabel(runAuditMatch[1])}.`
  }

  const humanReviewMatch = message.match(/^Human review is still required for the ([a-z_ ]+) audit\.$/i)
  if (humanReviewMatch) {
    return `La auditoria de ${getAuditTypeLabel(humanReviewMatch[1])} todavia requiere revision humana.`
  }

  const rejectedHumanReviewMatch = message.match(/^The latest human review on the ([a-z_ ]+) audit did not approve it\.$/i)
  if (rejectedHumanReviewMatch) {
    return `La ultima revision humana de la auditoria de ${getAuditTypeLabel(rejectedHumanReviewMatch[1])} no la aprobo.`
  }

  if (/^The latest [a-z]+-level human approval requested changes or rejected the [a-z]+\.$/i.test(message)) {
    return `La ultima aprobacion humana de ${unitLabel} pidio cambios o la rechazo.`
  }

  if (/^Run [a-z]+ planning\.$/i.test(message)) {
    return `Corre la planificacion de ${unitLabel}.`
  }

  if (/^Rework the [a-z]+ brief and rerun planning\.$/i.test(message)) {
    return `Ajusta el brief y vuelve a planificar ${unitLabel}.`
  }

  if (/^Cut or replace this [a-z]+ before continuing\.$/i.test(message)) {
    return `Recorta o reemplaza ${unitLabel} antes de continuar.`
  }

  if (/^Run [a-z]+ writing\.$/i.test(message)) {
    return `Redacta ${unitLabel}.`
  }

  if (/^Rewrite the [a-z]+ from the latest audits\.$/i.test(message)) {
    return 'Aplica mejoras usando las auditorias mas recientes.'
  }

  if (/^Complete the pending human reviews\.$/i.test(message)) {
    return 'Completa las revisiones humanas pendientes.'
  }

  if (/^Approve the [a-z]+\.$/i.test(message)) {
    return `Aprueba ${unitLabel}.`
  }

  if (/^[A-Z][a-z]+ approved\./.test(message)) {
    return `Workflow cerrado. Puedes generar la siguiente ${unitLabel}, revisar memoria canonica o exportar el proyecto.`
  }

  if (/^Inspect blockers and revise the [a-z]+\.$/i.test(message)) {
    return `Revisa los bloqueos y ajusta ${unitLabel}.`
  }

  return message
}
