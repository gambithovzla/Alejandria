import type {
  ApprovalDecision,
  ApprovalRecord,
  AuditReport,
  AuditType,
  MemoryStatus,
  MemoryItem,
  PipelineRunSummary,
  ProjectDetail,
  ProjectSummary,
  SceneSummary,
} from '@novel-engine/contracts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1'

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = await response.json()
      const detail = payload?.detail
      if (typeof detail === 'string') {
        throw new Error(detail)
      }
      if (detail?.message) {
        const blockers = Array.isArray(detail.blockers) && detail.blockers.length > 0 ? ` ${detail.blockers.join(' ')}` : ''
        throw new Error(`${detail.message}${blockers}`)
      }
      throw new Error(payload?.message || 'API request failed')
    }
    const text = await response.text()
    throw new Error(text || 'API request failed')
  }

  return response.json() as Promise<T>
}

function mapApproval(item: any): ApprovalRecord {
  return {
    id: item.id,
    targetType: item.targetType,
    targetId: item.targetId,
    decision: item.decision,
    reviewer: item.reviewer,
    notes: item.notes,
    createdAt: item.createdAt,
  }
}

function mapAudit(item: any): AuditReport {
  return {
    id: item.id,
    auditType: item.auditType,
    decision: item.decision,
    summary: item.summary,
    findings: item.findings,
    nextSteps: item.nextSteps,
    humanReviewRequired: item.humanReviewRequired,
    createdAt: item.createdAt,
    approvals: (item.approvals ?? []).map(mapApproval),
  }
}

function mapMemory(item: any): MemoryItem {
  return {
    id: item.id,
    kind: item.kind,
    key: item.key,
    statement: item.statement,
    status: item.status,
    notes: item.notes,
    sourceSceneId: item.sourceSceneId,
  }
}

function mapPipelineRun(item: any): PipelineRunSummary {
  return {
    id: item.id,
    projectId: item.projectId,
    sceneId: item.sceneId,
    pipelineType: item.pipelineType,
    status: item.status,
    inputPayload: item.inputPayload,
    outputPayload: item.outputPayload,
    errorMessage: item.errorMessage,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function mapScene(item: any): SceneSummary {
  return {
    id: item.id,
    projectId: item.projectId,
    sequenceNo: item.sequenceNo,
    chapterLabel: item.chapterLabel,
    title: item.title,
    purpose: item.purpose,
    brief: item.brief,
    povCharacter: item.povCharacter,
    location: item.location,
    status: item.status,
    planningPayload: item.planningPayload,
    necessityAssessment: item.necessityAssessment,
    draftMarkdown: item.draftMarkdown,
    audits: (item.audits ?? []).map(mapAudit),
    approvals: (item.approvals ?? []).map(mapApproval),
    workflow: item.workflow,
  }
}

function mapProjectSummary(item: any): ProjectSummary {
  return {
    id: item.id,
    title: item.title,
    premise: item.premise,
    genre: item.genre,
    audience: item.audience,
    status: item.status,
    sceneCount: item.sceneCount,
    updatedAt: item.updatedAt,
  }
}

function mapProjectDetail(item: any): ProjectDetail {
  return {
    ...mapProjectSummary(item),
    theme: item.theme,
    narrativePov: item.narrativePov,
    tense: item.tense,
    targetLengthWords: item.targetLengthWords,
    styleDna: item.styleDna,
    editorialJudgment: item.editorialJudgment,
    antiPatterns: item.antiPatterns,
    scenes: (item.scenes ?? []).map(mapScene),
    memories: (item.memories ?? []).map(mapMemory),
  }
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const payload = await request<any[]>('/projects')
  return payload.map(mapProjectSummary)
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  try {
    const payload = await request<any>(`/projects/${projectId}`)
    return mapProjectDetail(payload)
  } catch {
    return null
  }
}

export async function createProject(input: {
  title: string
  premise: string
  genre: string
  audience: string
}): Promise<ProjectDetail> {
  const payload = await request<any>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return mapProjectDetail(payload)
}

export async function createScene(
  projectId: string,
  input: { title: string; purpose: string; brief: string; povCharacter: string; location: string }
): Promise<SceneSummary> {
  const payload = await request<any>(`/projects/${projectId}/scenes`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return mapScene(payload)
}

export async function runScenePlanning(sceneId: string): Promise<SceneSummary> {
  const payload = await request<any>(`/scenes/${sceneId}/plan`, {
    method: 'POST',
  })
  return mapScene(payload)
}

export async function runSceneWriting(sceneId: string): Promise<SceneSummary> {
  const payload = await request<any>(`/scenes/${sceneId}/write`, {
    method: 'POST',
  })
  return mapScene(payload)
}

export async function runAudit(sceneId: string, auditType: AuditType): Promise<AuditReport> {
  const payload = await request<any>(`/scenes/${sceneId}/audits/${auditType}`, {
    method: 'POST',
  })
  return mapAudit(payload)
}

export async function createSceneApproval(
  sceneId: string,
  input: { reviewer: string; notes: string; decision: ApprovalDecision }
): Promise<ApprovalRecord> {
  return createApproval('scene', sceneId, input)
}

export async function createAuditApproval(
  auditId: string,
  input: { reviewer: string; notes: string; decision: ApprovalDecision }
): Promise<ApprovalRecord> {
  return createApproval('audit', auditId, input)
}

async function createApproval(
  targetType: 'scene' | 'audit',
  targetId: string,
  input: { reviewer: string; notes: string; decision: ApprovalDecision }
): Promise<ApprovalRecord> {
  const path = targetType === 'scene' ? `/approvals/scenes/${targetId}` : `/approvals/audits/${targetId}`
  const payload = await request<any>(path, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return mapApproval(payload)
}

export async function fetchProjectPipelineRuns(projectId: string): Promise<PipelineRunSummary[]> {
  const payload = await request<any[]>(`/projects/${projectId}/pipeline-runs`)
  return payload.map(mapPipelineRun)
}

export async function updateMemory(
  projectId: string,
  memoryId: string,
  input: { status: MemoryStatus; notes: string | null }
): Promise<MemoryItem> {
  const payload = await request<any>(`/projects/${projectId}/memories/${memoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return mapMemory(payload)
}

export function getExportUrl(projectId: string, format: 'json' | 'markdown') {
  return format === 'json'
    ? buildUrl(`/projects/${projectId}/export/json`)
    : buildUrl(`/projects/${projectId}/export/markdown`)
}
