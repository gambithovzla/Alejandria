import { notFound } from 'next/navigation'

import { AppShell } from '@/components/layout/app-shell'
import { ProjectDashboard } from '@/components/projects/project-dashboard'
import { fetchLLMHealthStatus, fetchProjectDetail, fetchProjectPipelineRuns, fetchProjects } from '@/lib/api'

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params
  const [projects, selectedProject, pipelineRuns, llmHealth] = await Promise.all([
    fetchProjects(),
    fetchProjectDetail(projectId),
    fetchProjectPipelineRuns(projectId).catch(() => []),
    fetchLLMHealthStatus().catch(() => null),
  ])

  if (!selectedProject) {
    notFound()
  }

  return (
    <AppShell>
      <ProjectDashboard llmHealth={llmHealth} pipelineRuns={pipelineRuns} projects={projects} selectedProject={selectedProject} />
    </AppShell>
  )
}
