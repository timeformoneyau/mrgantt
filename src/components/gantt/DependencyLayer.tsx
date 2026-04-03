'use client'

import React from 'react'
import { Task, Dependency, ViewState } from '@/types'
import { dateToX, ROW_HEIGHT, TASK_HEIGHT, TASK_TOP_OFFSET, parseDate } from '@/lib/timeline'
import { computeTaskLayout } from '@/lib/taskLayout'

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
  tasks,
  dependencies,
  viewState,
  rowYPositions,
  totalWidth,
  totalHeight,
  selectedTaskId,
}: DependencyLayerProps) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  // Build sublane map for all tasks
  const subLaneMap = new Map<string, number>()
  const rowTaskMap = new Map<string, Task[]>()
  for (const task of tasks) {
    const arr = rowTaskMap.get(task.rowId) ?? []
    arr.push(task)
    rowTaskMap.set(task.rowId, arr)
  }
  for (const [rowId, rowTasks] of rowTaskMap) {
    const layout = computeTaskLayout(rowTasks)
    for (const lt of layout) {
      subLaneMap.set(lt.task.id, lt.subLane)
    }
  }

  function getTaskCenter(taskId: string): { fromX: number; fromY: number; toX: number; toY: number } | null {
    const task = taskMap.get(taskId)
    if (!task) return null
    const rowY = rowYPositions.get(task.rowId)
    if (rowY === undefined) return null
    const subLane = subLaneMap.get(taskId) ?? 0

    const startX = dateToX(task.startDate, viewState.startDate, viewState.dayWidth)
    const endX = dateToX(task.endDate, viewState.startDate, viewState.dayWidth) + viewState.dayWidth
    const midY = rowY + subLane * ROW_HEIGHT + TASK_TOP_OFFSET + TASK_HEIGHT / 2

    return { fromX: endX, fromY: midY, toX: startX, toY: midY }
  }

  if (dependencies.length === 0) return null

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: totalWidth,
        height: totalHeight,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 14,
      }}
    >
      <defs>
        <marker
          id="dep-arrow"
          markerWidth="8"
          markerHeight="6"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6 L1.5,3 Z" fill="#94a3b8" />
        </marker>
        <marker
          id="dep-arrow-selected"
          markerWidth="8"
          markerHeight="6"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6 L1.5,3 Z" fill="#6366f1" />
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

        const isSelected = dep.fromTaskId === selectedTaskId || dep.toTaskId === selectedTaskId
        const color = isSelected ? '#6366f1' : '#94a3b8'

        // Bezier control point offset
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.4)
        const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`

        return (
          <path
            key={dep.id}
            d={pathD}
            stroke={color}
            strokeWidth={isSelected ? 1.75 : 1.25}
            fill="none"
            strokeDasharray={isSelected ? 'none' : '4 2'}
            markerEnd={isSelected ? 'url(#dep-arrow-selected)' : 'url(#dep-arrow)'}
            opacity={isSelected ? 1 : 0.65}
          />
        )
      })}
    </svg>
  )
}
