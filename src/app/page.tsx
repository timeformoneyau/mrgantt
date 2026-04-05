'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGanttStore } from '@/store/ganttStore'

const GanttChart = dynamic(() => import('@/components/gantt/GanttChart').then(m => m.GanttChart), {
  ssr: false,
})

export default function Home() {
  const syncFromServer = useGanttStore((s) => s.syncFromServer)

  useEffect(() => {
    syncFromServer()
  }, [syncFromServer])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <GanttChart />
    </div>
  )
}
