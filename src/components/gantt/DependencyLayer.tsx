'use client'

import React from 'react'
import { Task, Dependency, ViewState } from '@/types'
import { dateToX, ROW_HEIGHT, TASK_HEIGHT, TASK_TOP_OFFSET } from '@/lib/timeline'
import { computeTaskLayout } from '@/lib/taskLayout'
import { useTheme } from '@/lib/theme'

interface DependencyLayerProps {
  tasks: Task[]
  dependencies: Dependency[]
  viewState: ViewState
  rowYPositions: Map<string, number>
  totalWidth: number
  totalHeight: number
  selectedTaskId: string | null
}

export function DependencyLayer({
  tasks, dependencies, viewState, rowYPositions, totalWidth, totalHeight, selectedTaskId,
}: DependencyLayerProps) {
  const theme = useTheme()
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  // Build sublane map
  const subLaneMap = new Map<string, number>()
  const rowTaskMap = new Map<string, Task[]>()
  for (const task of tasks) {
    const arr = rowTaskMap.get(task.rowId) ?? []
    arr.push(task)
    rowTaskMap.set(task.rowId, arr)
  }
  for (const [, rowTasks] of rowTaskMap) {
    for (const lt of computeTaskLayout(rowTasks)) {
      subLaneMap.set(lt.task.id, lt.subLane)
    }
  }

  if (dependencies.length === 0) return null

  return (
    <svg style={{
      position: 'absolute', top: 0, left: 0,
      width: totalWidth, height: totalHeight,
      pointerEvents: 'none', overflow: 'visible', zIndex: 14,
    }}>
      <defs>
        {/* Inactive arrow: Mid Gray, slightly dimmer in dark mode to avoid visual noise */}
        <marker id="dep-arrow" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 L1.5,3 Z" fill={theme.isDark ? 'rgba(176,174,165,0.5)' : 'rgba(176,174,165,0.8)'} />
        </marker>
        <marker id="dep-arrow-active" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 L1.5,3 Z" fill="#55F366" />
        </marker>
      </defs>

      {dependencies.map((dep) => {
        const from = taskMap.get(dep.fromTaskId)
        const to = taskMap.get(dep.toTaskId)
        if (!from || !to) return null

        const fromRowY = rowYPositions.get(from.rowId)
        const toRowY = rowYPositions.get(to.rowId)
        if (fromRowY === undefined || toRowY === undefined) return null

        const fromSubLane = subLaneMap.get(dep.fromTaskId) ?? 0
        const toSubLane = subLaneMap.get(dep.toTaskId) ?? 0

        const x1 = dateToX(from.endDate, viewState.startDate, viewState.dayWidth) + viewState.dayWidth
        const y1 = fromRowY + fromSubLane * ROW_HEIGHT + TASK_TOP_OFFSET + TASK_HEIGHT / 2
        const x2 = dateToX(to.startDate, viewState.startDate, viewState.dayWidth)
        const y2 = toRowY + toSubLane * ROW_HEIGHT + TASK_TOP_OFFSET + TASK_HEIGHT / 2

        const isActive = dep.fromTaskId === selectedTaskId || dep.toTaskId === selectedTaskId
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.4)

        return (
          <path
            key={dep.id}
            d={`M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`}
            stroke={isActive ? '#55F366' : theme.isDark ? 'rgba(176,174,165,0.45)' : 'rgba(176,174,165,0.7)'}
            strokeWidth={isActive ? 1.75 : 1.25}
            fill="none"
            strokeDasharray={isActive ? undefined : '4 3'}
            markerEnd={isActive ? 'url(#dep-arrow-active)' : 'url(#dep-arrow)'}
          />
        )
      })}
    </svg>
  )
}
