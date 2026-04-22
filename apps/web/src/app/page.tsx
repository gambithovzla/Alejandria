import { AppShell } from '@/components/layout/app-shell'
import { ProjectDashboard } from '@/components/projects/project-dashboard'
import { fetchProjects } from '@/lib/api'

export default async function HomePage() {
  const projects = await fetchProjects()

  return (
    <AppShell>
      <ProjectDashboard pipelineRuns={[]} projects={projects} selectedProject={null} />
    </AppShell>
  )
}
