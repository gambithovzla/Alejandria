import type { ProjectDetail, SceneSummary } from '@novel-engine/contracts'

export function getApprovedScenes(project: Pick<ProjectDetail, 'scenes'>): SceneSummary[] {
  return [...project.scenes]
    .filter((scene) => scene.workflow?.latestSceneApprovalDecision === 'approve')
    .sort((left, right) => left.sequenceNo - right.sequenceNo)
}

export function getBookRoute(projectId: string, sequenceNo: number): string {
  return `/projects/${projectId}/read/${sequenceNo}`
}

export function getReaderMarkdown(scene: Pick<SceneSummary, 'draftMarkdown' | 'title'>): string {
  const draft = scene.draftMarkdown?.trim() ?? ''
  if (!draft) {
    return ''
  }

  const headingPatterns = [`# ${scene.title}`, `## ${scene.title}`, `### ${scene.title}`]
  for (const heading of headingPatterns) {
    if (draft.startsWith(heading)) {
      return draft.slice(heading.length).trimStart()
    }
  }

  return draft
}
