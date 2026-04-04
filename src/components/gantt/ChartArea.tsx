'use client'

import React, { useRef, useState } from 'react'
import { addDays } from 'date-fns'
import { Task, Row, ViewState } from '@/types'
import {
  dateToX, xToDate, getTotalWidth, getWeekColumns, getMonthGroups,
  ROW_HEIGHT, TASK_HEIGHT, TASK_TOP_OFFSET,
  parseDate, formatDate,
} from '@/lib/timeline'
import { computeTaskLayout, getSubLaneCount } from '@/lib/taskLayout'
import { TaskBar } from './TaskBar'
import { useGanttStore } from '@/store/ganttStore'
import { useTheme } from '@/lib/theme'

const CLICK_CREATE_DAYS = 5
const DRAG_THRESHOLD_PX = 6

interface CreateDragState {
  rowId: string
  startX: number
  currentX: number
  startDate: string
  currentDate: string
  active: boolean
  pointerId: number
}

interface ChartAreaProps {
  tasks: Task[]
  rows: Row[]
  viewState: ViewState
  selectedTaskId: string | null
  onSelectTask: (id: string | null) => void
  totalWidth: number
  rowYPositions: Map<string, number>
  totalHeight: number
  children?: React.ReactNode
  /** Task being moved via the floating drag clone — rendered as placeholder */
  movingTaskId?: string | null
  /** The row id currently highlighted as a drop target during move drag */
  dragTargetRowId?: string | null
  /** Called when user starts a move drag on a task bar */
  onMoveStart?: (
    taskId: string,
    e: React.PointerEvent,
    barEl: HTMLDivElement,
    originalClientX: number,
    originalClientY: number,
  ) => void
}

export function ChartArea({
  tasks, rows, viewState, selectedTaskId, onSelectTask,
  totalWidth, rowYPositions, totalHeight, children,
  movingTaskId, dragTargetRowId, onMoveStart,
}: ChartAreaProps) {
  const addTask = useGanttStore((s) => s.addTask)
  const theme = useTheme()
  const [createDrag, setCreateDrag] = useState<CreateDragState | null>(null)

  const { dayWidth, startDate: viewStart } = viewState
  const sortedRows = [...rows].sort((a, b) => {
    if (a.isSystem && !b.isSystem) return 1
    if (!a.isSystem && b.isSystem) return -1
    return a.order - b.order
  })

  const rowLayoutMap = new Map<string, ReturnType<typeof computeTaskLayout>>()
  const rowSubLaneCount = new Map<string, number>()
  for (const row of sortedRows) {
    const rowTasks = tasks.filter((t) => t.rowId === row.id)
    rowLayoutMap.set(row.id, computeTaskLayout(rowTasks))
    rowSubLaneCount.set(row.id, Math.max(1, getSubLaneCount(rowTasks)))
  }

  const todayX = dateToX(new Date(), viewStart, dayWidth)
  const weekCols = getWeekColumns(viewState.startDate, viewState.endDate, dayWidth)
  const monthBands = getMonthGroups(viewState.startDate, viewState.endDate, dayWidth)

  function handleRowPointerDown(e: React.PointerEvent, rowId: string, rowEl: HTMLDivElement) {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-task-bar]')) return
    const rect = rowEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const snappedDate = formatDate(xToDate(x, viewStart, dayWidth))
    ;(rowEl as HTMLElement).setPointerCapture(e.pointerId)
    setCreateDrag({ rowId, startX: e.clientX, currentX: e.clientX, startDate: snappedDate, currentDate: snappedDate, active: false, pointerId: e.pointerId })
  }

  function handleRowPointerMove(e: React.PointerEvent, rowEl: HTMLDivElement) {
    if (!createDrag) return
    const dx = Math.abs(e.clientX - createDrag.startX)
    const rect = rowEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const snappedDate = formatDate(xToDate(x, viewStart, dayWidth))
    setCreateDrag((prev) => prev ? { ...prev, currentX: e.clientX, currentDate: snappedDate, active: dx > DRAG_THRESHOLD_PX } : null)
  }

  function handleRowPointerUp(e: React.PointerEvent, rowEl: HTMLDivElement) {
    if (!createDrag) return
    ;(rowEl as HTMLElement).releasePointerCapture(createDrag.pointerId)
    const dx = Math.abs(e.clientX - createDrag.startX)
    if (dx <= DRAG_THRESHOLD_PX) {
      const id = addTask({
        title: 'New task', description: '', owner: '',
        startDate: createDrag.startDate,
        endDate: formatDate(addDays(parseDate(createDrag.startDate), CLICK_CREATE_DAYS - 1)),
        rowId: createDrag.rowId,
      })
      onSelectTask(id)
    } else {
      const d1 = parseDate(createDrag.startDate), d2 = parseDate(createDrag.currentDate)
      const start = d1 <= d2 ? createDrag.startDate : createDrag.currentDate
      const end = d1 <= d2 ? createDrag.currentDate : createDrag.startDate
      const id = addTask({ title: 'New task', description: '', owner: '', startDate: start, endDate: end, rowId: createDrag.rowId })
      onSelectTask(id)
    }
    setCreateDrag(null)
  }

  let ghostStart: string | null = null, ghostEnd: string | null = null, ghostRowId: string | null = null
  if (createDrag?.active) {
    const d1 = parseDate(createDrag.startDate), d2 = parseDate(createDrag.currentDate)
    ghostStart = d1 <= d2 ? createDrag.startDate : createDrag.currentDate
    ghostEnd = d1 <= d2 ? createDrag.currentDate : createDrag.startDate
    ghostRowId = createDrag.rowId
  }

  return (
    <div style={{ position: 'relative', width: totalWidth, minWidth: totalWidth, alignSelf: 'stretch', background: theme.surface }}>
      {/* Background grid */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: totalWidth, height: '100%', pointerEvents: 'none', zIndex: 1 }}>
        {/* Subtle month alternating background bands */}
        {monthBands.map((m, i) => i % 2 === 1 ? (
          <div key={m.date.toISOString() + '-band'} style={{
            position: 'absolute', left: m.x, top: 0, width: m.width, height: '100%',
            background: theme.isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,4,4,0.018)',
            pointerEvents: 'none',
          }} />
        ) : null)}
        {weekCols.map((col) => (
          <div key={col.date.toISOString()} style={{
            position: 'absolute', left: col.x, top: 0, width: 1, height: '100%',
            background: col.isQuarterBoundary
              ? 'rgba(85,243,102,0.35)'
              : col.isMonthBoundary
              ? theme.textMuted
              : theme.border,
            opacity: col.isQuarterBoundary ? 1 : col.isMonthBoundary ? 0.5 : 1,
          }} />
        ))}
      </div>

      {/* Today line — Tiimely Green */}
      {todayX >= 0 && todayX <= totalWidth && (
        <div style={{
          position: 'absolute', left: todayX, top: 0, width: 2, height: '100%',
          background: '#55F366', opacity: 0.75,
          pointerEvents: 'none', zIndex: 13, borderRadius: 1,
        }} />
      )}

      {/* Rows */}
      {sortedRows.map((row) => {
        const numLanes = rowSubLaneCount.get(row.id) ?? 1
        const rowHeight = numLanes * ROW_HEIGHT
        const layout = rowLayoutMap.get(row.id) ?? []
        const isCreatingInRow = createDrag?.rowId === row.id

        return (
          <RowTrack
            key={row.id}
            row={row}
            rowHeight={rowHeight}
            isCreating={isCreatingInRow ?? false}
            rowBg={theme.surface}
            rowBorder={theme.borderSubtle}
            isSystemRow={!!row.isSystem}
            isDragTarget={row.id === dragTargetRowId}
            onPointerDown={(e, el) => handleRowPointerDown(e, row.id, el)}
            onPointerMove={(e, el) => handleRowPointerMove(e, el)}
            onPointerUp={(e, el) => handleRowPointerUp(e, el)}
            onPointerCancel={() => setCreateDrag(null)}
            onClick={() => onSelectTask(null)}
          >
            {layout.map(({ task, subLane }) => (
              <TaskBar
                key={task.id}
                task={task} subLane={subLane} viewState={viewState}
                isSelected={task.id === selectedTaskId}
                onSelect={onSelectTask}
                isMovePlaceholder={task.id === movingTaskId}
                totalWidth={totalWidth}
                onMoveStart={onMoveStart}
              />
            ))}
            {isCreatingInRow && ghostStart && ghostEnd && (
              <GhostBar startDate={ghostStart} endDate={ghostEnd} viewState={viewState} />
            )}
          </RowTrack>
        )
      })}

      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RowTrack
// ---------------------------------------------------------------------------
function RowTrack({ row, rowHeight, isCreating, rowBg, rowBorder, isSystemRow, isDragTarget, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick, children }: {
  row: Row; rowHeight: number; isCreating: boolean; rowBg: string; rowBorder: string;
  isSystemRow: boolean; isDragTarget: boolean;
  onPointerDown: (e: React.PointerEvent, el: HTMLDivElement) => void
  onPointerMove: (e: React.PointerEvent, el: HTMLDivElement) => void
  onPointerUp: (e: React.PointerEvent, el: HTMLDivElement) => void
  onPointerCancel: () => void; onClick: () => void; children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      data-row-id={row.id}
      onPointerDown={(e) => ref.current && onPointerDown(e, ref.current)}
      onPointerMove={(e) => ref.current && onPointerMove(e, ref.current)}
      onPointerUp={(e) => ref.current && onPointerUp(e, ref.current)}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      style={{
        position: 'relative', height: rowHeight,
        borderBottom: `1px solid ${rowBorder}`,
        borderTop: isSystemRow ? '2px solid rgba(85,243,102,0.15)' : undefined,
        cursor: isCreating ? 'crosshair' : 'default',
        background: isDragTarget ? 'rgba(85,243,102,0.07)' : rowBg,
        zIndex: 5,
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ghost bar for drag-to-create preview
// ---------------------------------------------------------------------------
function GhostBar({ startDate, endDate, viewState }: { startDate: string; endDate: string; viewState: ViewState }) {
  const { dayWidth, startDate: viewStart } = viewState
  const theme = useTheme()
  const left = dateToX(startDate, viewStart, dayWidth)
  const right = dateToX(endDate, viewStart, dayWidth) + dayWidth
  const width = Math.max(right - left, dayWidth)

  return (
    <div style={{
      position: 'absolute', left, top: TASK_TOP_OFFSET, width, height: TASK_HEIGHT,
      background: '#55F366', borderRadius: 5, opacity: theme.ghostOpacity,
      border: '2px dashed #55F366', pointerEvents: 'none', zIndex: 8,
    }} />
  )
}
