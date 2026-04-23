import { notFound } from 'next/navigation'

import { ProjectBookReader } from '@/components/projects/project-book-reader'
import { fetchProjectDetail } from '@/lib/api'
import { getApprovedScenes } from '@/lib/project-reading'

interface ReaderPageProps {
  params: Promise<{ projectId: string; sequenceNo: string }>
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { projectId, sequenceNo } = await params
  const project = await fetchProjectDetail(projectId)

  if (!project) {
    notFound()
  }

  const approvedScenes = getApprovedScenes(project)
  const activeScene = approvedScenes.find((scene) => scene.sequenceNo === Number(sequenceNo))

  if (!activeScene) {
    notFound()
  }

  return <ProjectBookReader activeScene={activeScene} approvedScenes={approvedScenes} project={project} />
}
