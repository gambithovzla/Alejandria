export type AuditType = 'technical' | 'literary' | 'adversarial'
export type AuditDecision = 'pass' | 'pass_with_notes' | 'needs_revision' | 'blocked'
export type ApprovalDecision = 'approve' | 'request_changes' | 'reject'
export type MemoryKind = 'factual' | 'dramatic'
export type MemoryStatus = 'candidate' | 'confirmed' | 'retired'
export type PipelineType =
  | 'scene_planning'
  | 'scene_writing'
  | 'technical_audit'
  | 'literary_audit'
  | 'adversarial_audit'
export type SceneStatus = 'backlog' | 'planned' | 'drafted' | 'reviewing' | 'approved'
export type NecessityDecision = 'keep' | 'rework' | 'cut'

export interface StyleDNA {
  voiceReference: string
  sentenceProfile: string
  dialogueProfile: string
  sensoryProfile: string
  forbiddenMoves: string[]
}

export interface EditorialJudgment {
  northStar: string
  commercialIntent: string
  priorities: string[]
  nonNegotiables: string[]
  riskTolerance: 'low' | 'medium' | 'high'
}

export interface AntiPattern {
  label: string
  description: string
  warningSigns: string[]
}

export interface MemoryItem {
  id: string
  kind: MemoryKind
  key: string
  statement: string
  status: MemoryStatus
  notes: string | null
  sourceSceneId: string | null
}

export interface NecessityAssessment {
  changeTrigger: string
  stakesIfRemoved: string
  conflictContribution: string
  dramaticShift: string
  decision: NecessityDecision
  rationale: string
}

export interface SceneBeat {
  label: string
  intent: string
  escalation: string
}

export interface ScenePlan {
  logline: string
  goal: string
  conflict: string
  turn: string
  outcome: string
  beats: SceneBeat[]
  necessityTest: NecessityAssessment
  factualUpdates: Array<{ key: string; statement: string; notes: string }>
  dramaticUpdates: Array<{ key: string; statement: string; notes: string }>
  humanReviewQuestions: string[]
}

export interface SceneDraft {
  excerptMarkdown: string
  writerIntent: string
  continuityNotes: string[]
  openQuestions: string[]
}

export interface AuditFinding {
  area: string
  severity: 'info' | 'warning' | 'critical'
  issue: string
  evidence: string
  recommendedAction: string
  requiresHumanReview: boolean
}

export interface AuditReport {
  id: string
  auditType: AuditType
  decision: AuditDecision
  summary: string
  findings: AuditFinding[]
  nextSteps: string[]
  humanReviewRequired: boolean
  createdAt: string
  approvals: ApprovalRecord[]
}

export interface ApprovalRecord {
  id: string
  targetType: 'scene' | 'audit'
  targetId: string
  decision: ApprovalDecision
  reviewer: string
  notes: string
  createdAt: string
}

export interface PipelineRunSummary {
  id: string
  projectId: string
  sceneId: string | null
  pipelineType: PipelineType
  status: string
  inputPayload: Record<string, unknown>
  outputPayload: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface SceneWorkflowSnapshot {
  necessityPassed: boolean
  canRunPlanning: boolean
  canRunWriting: boolean
  canRunTechnicalAudit: boolean
  canRunLiteraryAudit: boolean
  canRunAdversarialAudit: boolean
  canApproveScene: boolean
  technicalAuditDecision: AuditDecision | null
  literaryAuditDecision: AuditDecision | null
  adversarialAuditDecision: AuditDecision | null
  latestSceneApprovalDecision: ApprovalDecision | null
  pendingHumanReviews: string[]
  blockers: string[]
  nextRecommendedAction: string
}

export interface SceneSummary {
  id: string
  projectId: string
  sequenceNo: number
  chapterLabel: string | null
  title: string
  purpose: string
  brief: string
  povCharacter: string | null
  location: string | null
  status: SceneStatus
  planningPayload: ScenePlan | null
  necessityAssessment: NecessityAssessment | null
  draftMarkdown: string | null
  audits: AuditReport[]
  approvals: ApprovalRecord[]
  workflow: SceneWorkflowSnapshot
}

export interface ProjectSummary {
  id: string
  title: string
  premise: string
  genre: string
  audience: string
  status: string
  sceneCount: number
  updatedAt: string
}

export interface ProjectDetail extends ProjectSummary {
  theme: string | null
  narrativePov: string | null
  tense: string | null
  targetLengthWords: number | null
  styleDna: StyleDNA
  editorialJudgment: EditorialJudgment
  antiPatterns: AntiPattern[]
  scenes: SceneSummary[]
  memories: MemoryItem[]
}
