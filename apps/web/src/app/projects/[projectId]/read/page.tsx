import { notFound, redirect } from 'next/navigation'

import { fetchProjectDetail } from '@/lib/api'
import { getApprovedScenes, getBookRoute } from '@/lib/project-reading'

interface ReaderLandingPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ReaderLandingPage({ params }: ReaderLandingPageProps) {
  const { projectId } = await params
  const project = await fetchProjectDetail(projectId)

  if (!project) {
    notFound()
  }

  const approvedScenes = getApprovedScenes(project)
  if (approvedScenes.length === 0) {
    notFound()
  }

  redirect(getBookRoute(project.id, approvedScenes[0].sequenceNo))
}
