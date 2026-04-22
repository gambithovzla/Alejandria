import { notFound } from 'next/navigation'

import { AppShell } from '@/components/layout/app-shell'
import { ProjectDashboard } from '@/components/projects/project-dashboard'
import { fetchProjectDetail, fetchProjectPipelineRuns, fetchProjects } from '@/lib/api'

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params
  const [projects, selectedProject, pipelineRuns] = await Promise.all([
    fetchProjects(),
    fetchProjectDetail(projectId),
    fetchProjectPipelineRuns(projectId).catch(() => []),
  ])

  if (!selectedProject) {
    notFound()
  }

  return (
    <AppShell>
      <ProjectDashboard pipelineRuns={pipelineRuns} projects={projects} selectedProject={selectedProject} />
    </AppShell>
  )
}
