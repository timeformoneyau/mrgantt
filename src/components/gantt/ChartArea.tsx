'use client'

import React, { useRef, useCallback, useState } from 'react'
import { format, addDays } from 'date-fns'
import { Task, Row, ViewState } from '@/types'
import {
  dateToX,
  xToDate,
  getTotalWidth,
  getWeekColumns,
  ROW_HEIGHT,
  TASK_HEIGHT,
  TASK_TOP_OFFSET,
  LEFT_PANEL_WIDTH,
  parseDate,
  formatDate,
} from '@/lib/timeline'
import { computeTaskLayout, getSubLaneCount } from '@/lib/taskLayout'
import { TaskBar } from './TaskBar'
import { useGanttStore } from '@/store/ganttStore'

// Default duration for a click-to-create (in days)
const CLICK_CREATE_DAYS = 5
const DRAG_THRESHOLD_PX = 6

interface CreateDragState {
  rowId: string
  startX: number // client x when pointer went down
  currentX: number
  startDate: string
  currentDate: string
  active: boolean // has exceeded threshold
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
  children?: React.ReactNode // dependency + divider layers
}

export function ChartArea({
  tasks, rows, viewState, selectedTaskId, onSelectTask,
  totalWidth, rowYPositions, totalHeight, children,
}: ChartAreaProps) {
  const addTask = useGanttStore((s) => s.addTask)
  const [createDrag, setCreateDrag] = useState<CreateDragState | null>(null)

  const { dayWidth, startDate: viewStart } = viewState

  // Sorted rows
  const sortedRows = [...rows].sort((a, b) => a.order - b.order)

  // Per-row task layout
  const rowLayoutMap = new Map<string, ReturnType<typeof computeTaskLayout>>()
  const rowSubLaneCount = new Map<string, number>()
  for (const row of sortedRows) {
    const rowTasks = tasks.filter((t) => t.rowId === row.id)
    const layout = computeTaskLayout(rowTasks)
    rowLayoutMap.set(row.id, layout)
    rowSubLaneCount.set(row.id, Math.max(1, getSubLaneCount(rowTasks)))
  }

  // Today line
  const todayX = dateToX(new Date(), viewStart, dayWidth)

  // -----------------------------------------------------------------------
  // Row background pointer events (for drag-to-create)
  // -----------------------------------------------------------------------
  function handleRowPointerDown(e: React.PointerEvent, rowId: string, rowEl: HTMLDivElement) {
    // Only react to left-button on the background (not on task bars)
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-task-bar]')) return

    const rect = rowEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const snappedDate = formatDate(xToDate(x, viewStart, dayWidth))

    ;(rowEl as HTMLElement).setPointerCapture(e.pointerId)
    setCreateDrag({
      rowId,
      startX: e.clientX,
      currentX: e.clientX,
      startDate: snappedDate,
      currentDate: snappedDate,
      active: false,
      pointerId: e.pointerId,
    })
  }

  function handleRowPointerMove(e: React.PointerEvent, rowEl: HTMLDivElement) {
    if (!createDrag) return
    const dx = Math.abs(e.clientX - createDrag.startX)
    const rect = rowEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const snappedDate = formatDate(xToDate(x, viewStart, dayWidth))

    setCreateDrag((prev) =>
      prev
        ? { ...prev, currentX: e.clientX, currentDate: snappedDate, active: dx > DRAG_THRESHOLD_PX }
        : null
    )
  }

  function handleRowPointerUp(e: React.PointerEvent, rowEl: HTMLDivElement) {
    if (!createDrag) return
    ;(rowEl as HTMLElement).releasePointerCapture(createDrag.pointerId)

    const dx = Math.abs(e.clientX - createDrag.startX)

    if (dx <= DRAG_THRESHOLD_PX) {
      // Click → create 5-day task
      const id = addTask({
        title: 'New task',
        description: '',
        owner: '',
        startDate: createDrag.startDate,
        endDate: formatDate(addDays(parseDate(createDrag.startDate), CLICK_CREATE_DAYS - 1)),
        rowId: createDrag.rowId,
      })
      onSelectTask(id)
    } else {
      // Drag → create with custom duration
      const d1 = parseDate(createDrag.startDate)
      const d2 = parseDate(createDrag.currentDate)
      const start = d1 <= d2 ? createDrag.startDate : createDrag.currentDate
      const end = d1 <= d2 ? createDrag.currentDate : createDrag.startDate
      const id = addTask({
        title: 'New task',
        description: '',
        owner: '',
        startDate: start,
        endDate: end,
        rowId: createDrag.rowId,
      })
      onSelectTask(id)
    }

    setCreateDrag(null)
  }

  function handleRowPointerCancel() {
    setCreateDrag(null)
  }

  // Compute ghost preview for create drag
  let ghostStart: string | null = null
  let ghostEnd: string | null = null
  let ghostRowId: string | null = null
  if (createDrag?.active) {
    const d1 = parseDate(createDrag.startDate)
    const d2 = parseDate(createDrag.currentDate)
    ghostStart = d1 <= d2 ? createDrag.startDate : createDrag.currentDate
    ghostEnd = d1 <= d2 ? createDrag.currentDate : createDrag.startDate
    ghostRowId = createDrag.rowId
  }

  // Week column grid lines (for background)
  const weekCols = getWeekColumns(viewState.startDate, viewState.endDate, dayWidth)

  return (
    <div style={{ position: 'relative', width: totalWidth, minWidth: totalWidth }}>
      {/* ------------------------------------------------------------------ */}
      {/* Background grid */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: totalWidth,
          height: totalHeight,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {weekCols.map((col) => (
          <div
            key={col.date.toISOString()}
            style={{
              position: 'absolute',
              left: col.x,
              top: 0,
              width: 1,
              height: totalHeight,
              background: col.isQuarterBoundary
                ? '#9ca3af'
                : col.isMonthBoundary
                ? '#d1d5db'
                : '#f3f4f6',
              opacity: col.isQuarterBoundary ? 0.6 : 1,
            }}
          />
        ))}
      </div>

      {/* Today line */}
      {todayX >= 0 && todayX <= totalWidth && (
        <div
          style={{
            position: 'absolute',
            left: todayX,
            top: 0,
            width: 2,
            height: totalHeight,
            background: '#ef4444',
            opacity: 0.5,
            pointerEvents: 'none',
            zIndex: 13,
            borderRadius: 1,
          }}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Rows */}
      {/* ------------------------------------------------------------------ */}
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
            onPointerDown={(e, el) => handleRowPointerDown(e, row.id, el)}
            onPointerMove={(e, el) => handleRowPointerMove(e, el)}
            onPointerUp={(e, el) => handleRowPointerUp(e, el)}
            onPointerCancel={handleRowPointerCancel}
            onClick={() => onSelectTask(null)}
          >
            {/* Actual task bars */}
            {layout.map(({ task, subLane }) => (
              <TaskBar
                key={task.id}
                task={task}
                subLane={subLane}
                viewState={viewState}
                isSelected={task.id === selectedTaskId}
                onSelect={onSelectTask}
              />
            ))}

            {/* Ghost preview while creating in this row */}
            {isCreatingInRow && ghostStart && ghostEnd && (
              <GhostBar
                startDate={ghostStart}
                endDate={ghostEnd}
                viewState={viewState}
              />
            )}
          </RowTrack>
        )
      })}

      {/* ------------------------------------------------------------------ */}
      {/* Dependency + divider overlay layers */}
      {/* ------------------------------------------------------------------ */}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RowTrack
// ---------------------------------------------------------------------------
interface RowTrackProps {
  row: Row
  rowHeight: number
  isCreating: boolean
  onPointerDown: (e: React.PointerEvent, el: HTMLDivElement) => void
  onPointerMove: (e: React.PointerEvent, el: HTMLDivElement) => void
  onPointerUp: (e: React.PointerEvent, el: HTMLDivElement) => void
  onPointerCancel: () => void
  onClick: () => void
  children: React.ReactNode
}

function RowTrack({
  row, rowHeight, isCreating,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
  onClick, children,
}: RowTrackProps) {
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
        position: 'relative',
        height: rowHeight,
        borderBottom: '1px solid #f3f4f6',
        cursor: isCreating ? 'crosshair' : 'default',
        zIndex: 5,
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GhostBar — preview while drag-to-create
// ---------------------------------------------------------------------------
function GhostBar({
  startDate, endDate, viewState,
}: {
  startDate: string
  endDate: string
  viewState: ViewState
}) {
  const { dayWidth, startDate: viewStart } = viewState
  const left = dateToX(startDate, viewStart, dayWidth)
  const right = dateToX(endDate, viewStart, dayWidth) + dayWidth
  const width = Math.max(right - left, dayWidth)

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: TASK_TOP_OFFSET,
        width,
        height: TASK_HEIGHT,
        background: '#6366f1',
        borderRadius: 6,
        opacity: 0.3,
        border: '2px dashed #6366f1',
        pointerEvents: 'none',
        zIndex: 8,
      }}
    />
  )
}
