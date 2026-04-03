'use client'

import dynamic from 'next/dynamic'

const GanttChart = dynamic(() => import('@/components/gantt/GanttChart').then(m => m.GanttChart), {
  ssr: false,
})

export default function Home() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <GanttChart />
    </div>
  )
}
