import type {
  ApprovalDecision,
  ApprovalRecord,
  AuditReport,
  AuditType,
  DraftVersionSummary,
  LLMHealthStatus,
  MemoryStatus,
  MemoryItem,
  PipelineRunSummary,
  ProjectDetail,
  ProjectSummary,
  SceneSummary,
  StructureMode,
  WorkType,
} from '@novel-engine/contracts'

const SERVER_API_BASE_URL = process.env.NOVEL_ENGINE_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1'
const BROWSER_API_BASE_URL = '/api/novel-engine'

function resolveApiBaseUrl() {
  return typeof window === 'undefined' ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL
}

function buildUrl(path: string) {
  return `${resolveApiBaseUrl()}${path}`
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
  const llm = item.inputPayload?.llm
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
    llm: llm
      ? {
          requestedProvider: llm.requested_provider ?? llm.requestedProvider ?? 'unknown',
          requestedModel: llm.requested_model ?? llm.requestedModel ?? 'unknown',
          provider: llm.provider ?? 'unknown',
          model: llm.model ?? 'unknown',
          usage: llm.usage
            ? {
                inputTokens: llm.usage.input_tokens ?? llm.usage.inputTokens ?? null,
                outputTokens: llm.usage.output_tokens ?? llm.usage.outputTokens ?? null,
                totalTokens: llm.usage.total_tokens ?? llm.usage.totalTokens ?? null,
                cachedInputTokens: llm.usage.cached_input_tokens ?? llm.usage.cachedInputTokens ?? null,
                cacheWriteTokens: llm.usage.cache_write_tokens ?? llm.usage.cacheWriteTokens ?? null,
                estimatedCostUsd: llm.usage.estimated_cost_usd ?? llm.usage.estimatedCostUsd ?? null,
                currency: llm.usage.currency ?? 'USD',
              }
            : null,
          fallbackUsed: Boolean(llm.fallback_used ?? llm.fallbackUsed),
          fallbackReason: llm.fallback_reason ?? llm.fallbackReason ?? null,
        }
      : null,
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
    draftVersions: (item.draftVersions ?? []).map(mapDraftVersion),
    audits: (item.audits ?? []).map(mapAudit),
    approvals: (item.approvals ?? []).map(mapApproval),
    workflow: item.workflow,
  }
}

function mapDraftVersion(item: any): DraftVersionSummary {
  return {
    id: item.id,
    sceneId: item.sceneId,
    versionNo: item.versionNo,
    sourceType: item.sourceType,
    sourceLabel: item.sourceLabel,
    draftMarkdown: item.draftMarkdown,
    changeSummary: item.changeSummary ?? [],
    editorialRationale: item.editorialRationale ?? null,
    basedOnVersionId: item.basedOnVersionId ?? null,
    isActive: Boolean(item.isActive),
    createdAt: item.createdAt,
    activatedAt: item.activatedAt ?? null,
  }
}

function mapProjectSummary(item: any): ProjectSummary {
  return {
    id: item.id,
    title: item.title,
    premise: item.premise,
    workType: item.workType,
    structureMode: item.structureMode,
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
  workType: WorkType
  structureMode: StructureMode
  genre: string
  audience: string
}): Promise<ProjectDetail> {
  const payload = await request<any>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return mapProjectDetail(payload)
}

export async function updateProject(projectId: string, input: {
  title: string
  premise: string
  workType: WorkType
  structureMode: StructureMode
  genre: string
  audience: string
  theme: string | null
  narrativePov: string | null
  tense: string | null
  targetLengthWords: number | null
  styleDna: ProjectDetail['styleDna']
  editorialJudgment: ProjectDetail['editorialJudgment']
  antiPatterns: ProjectDetail['antiPatterns']
}): Promise<ProjectDetail> {
  const payload = await request<any>(`/projects/${projectId}`, {
    method: 'PATCH',
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

export async function rewriteSceneFromAudits(sceneId: string): Promise<SceneSummary> {
  const payload = await request<any>(`/scenes/${sceneId}/rewrite-from-audits`, {
    method: 'POST',
  })
  return mapScene(payload)
}

export async function activateDraftVersion(sceneId: string, versionId: string): Promise<SceneSummary> {
  const payload = await request<any>(`/scenes/${sceneId}/draft-versions/${versionId}/activate`, {
    method: 'POST',
  })
  return mapScene(payload)
}

export async function continueToNextScene(sceneId: string, input: { includeDraft: boolean }): Promise<SceneSummary> {
  const payload = await request<any>(`/scenes/${sceneId}/continue`, {
    method: 'POST',
    body: JSON.stringify(input),
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

export async function fetchLLMHealthStatus(): Promise<LLMHealthStatus> {
  return request<LLMHealthStatus>('/health/llm')
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

export function getExportUrl(projectId: string, format: 'json' | 'markdown' | 'book-markdown') {
  if (format === 'json') {
    return buildUrl(`/projects/${projectId}/export/json`)
  }
  if (format === 'book-markdown') {
    return buildUrl(`/projects/${projectId}/export/book-markdown`)
  }
  return buildUrl(`/projects/${projectId}/export/markdown`)
}
