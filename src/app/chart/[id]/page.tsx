'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useGanttStore } from '@/store/ganttStore'

const GanttChart = dynamic(
  () => import('@/components/gantt/GanttChart').then((m) => m.GanttChart),
  { ssr: false }
)

export default function ChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const syncFromServer = useGanttStore((s) => s.syncFromServer)
  const setProjectId = useGanttStore((s) => s.setProjectId)

  useEffect(() => {
    setProjectId(id)
    syncFromServer(id)
  }, [id, setProjectId, syncFromServer])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <GanttChart onHome={() => router.push('/')} />
    </div>
  )
}
