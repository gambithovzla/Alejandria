import { AppShell } from '@/components/layout/app-shell'
import { ProjectDashboard } from '@/components/projects/project-dashboard'
import { fetchLLMHealthStatus, fetchProjects } from '@/lib/api'

export default async function HomePage() {
  const [projects, llmHealth] = await Promise.all([fetchProjects(), fetchLLMHealthStatus().catch(() => null)])

  return (
    <AppShell>
      <ProjectDashboard llmHealth={llmHealth} pipelineRuns={[]} projects={projects} selectedProject={null} />
    </AppShell>
  )
}
