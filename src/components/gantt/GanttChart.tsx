'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { addDays, format } from 'date-fns'
import { useGanttStore } from '@/store/ganttStore'
import { Toolbar } from '@/components/ui/Toolbar'
import { TimelineHeader } from './TimelineHeader'
import { ChartArea } from './ChartArea'
import { RowPanel } from './RowPanel'
import { DependencyLayer } from './DependencyLayer'
import { DividerLayer } from './DividerLayer'
import { DragClone } from './DragClone'
import { TaskSidePanel } from './TaskSidePanel'
import {
  getTotalWidth,
  LEFT_PANEL_WIDTH,
  HEADER_HEIGHT,
  ROW_HEIGHT,
  dateToX,
  parseDate,
  formatDate,
} from '@/lib/timeline'
import { getSubLaneCount } from '@/lib/taskLayout'
import { useTheme } from '@/lib/theme'
import { Task, Row } from '@/types'

// ---------------------------------------------------------------------------
// Move-drag state
// ---------------------------------------------------------------------------
interface MoveState {
  taskId: string
  task: Task
  /** clientX where the drag started */
  startClientX: number
  /** Offset from bar's left edge to cursor when drag started */
  grabOffsetX: number
  /** Offset from bar's top edge to cursor when drag started */
  grabOffsetY: number
  barWidth: number
  pointerId: number
  /** Continuously updated: the row the cursor is currently over */
  currentRowId: string
}

interface MoveCloneData {
  task: Task
  barWidth: number
  /** barRect.left at drag start — initial transform X */
  initialX: number
  /** barRect.top at drag start — initial transform Y */
  initialY: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GanttChart() {
  const {
    tasks, rows, dividers, dependencies,
    viewState, selectedTaskId, sidePanelOpen,
    selectTask, setSidePanelOpen,
    updateTask, deleteTask,
    undo, redo,
  } = useGanttStore()
  const theme = useTheme()

  const scrollRef = useRef<HTMLDivElement>(null)

  // Move-drag
  const moveStateRef = useRef<MoveState | null>(null)
  const cloneRef = useRef<HTMLDivElement | null>(null)
  const dateLabelRef = useRef<HTMLSpanElement | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [moveClone, setMoveClone] = useState<MoveCloneData | null>(null)
  const [dragTargetRowId, setDragTargetRowId] = useState<string | null>(null)

  // Stable refs for data accessed in event handlers (avoid stale closures)
  const sortedRowsRef = useRef<Row[]>([])
  const tasksRef = useRef<Task[]>([])
  const viewStateDayWidthRef = useRef(viewState.dayWidth)

  const sortedRows = [...rows].sort((a, b) => a.order - b.order)
  sortedRowsRef.current = sortedRows
  tasksRef.current = tasks
  viewStateDayWidthRef.current = viewState.dayWidth

  // Sync body background with theme
  useEffect(() => {
    document.body.style.background = theme.bg
  }, [theme.bg])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      if ((e.target as HTMLElement).tagName === 'SELECT') return

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.shiftKey && e.key === 'z'))
      ) {
        e.preventDefault()
        redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTaskId) {
        e.preventDefault()
        deleteTask(selectedTaskId)
        selectTask(null)
      } else if (e.key === 'Escape') {
        if (moveStateRef.current) {
          // Cancel in-flight drag
          moveStateRef.current = null
          setMovingTaskId(null)
          setMoveClone(null)
        } else {
          selectTask(null)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo, selectTask, deleteTask, selectedTaskId])

  // Jump to today
  useEffect(() => {
    function handleJumpToday() {
      if (!scrollRef.current) return
      const todayX = dateToX(new Date(), viewState.startDate, viewState.dayWidth)
      const containerWidth = scrollRef.current.clientWidth - LEFT_PANEL_WIDTH
      const targetScrollLeft = Math.max(0, todayX - containerWidth / 2)
      scrollRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
    }
    window.addEventListener('gantt:jump-today', handleJumpToday)
    return () => window.removeEventListener('gantt:jump-today', handleJumpToday)
  }, [viewState])

  // Auto-scroll to today on mount / zoom change
  useEffect(() => {
    if (!scrollRef.current) return
    const todayX = dateToX(new Date(), viewState.startDate, viewState.dayWidth)
    const containerWidth = scrollRef.current.clientWidth - LEFT_PANEL_WIDTH
    const targetScrollLeft = Math.max(0, todayX - containerWidth / 3)
    scrollRef.current.scrollLeft = targetScrollLeft
  }, [viewState.startDate, viewState.dayWidth])

  // ---------------------------------------------------------------------------
  // Row detection from clientY (uses refs for fresh data)
  // ---------------------------------------------------------------------------
  const getRowIdFromClientY = useCallback((clientY: number): string | null => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return null
    const rect = scrollEl.getBoundingClientRect()
    const relY = clientY - rect.top + scrollEl.scrollTop - HEADER_HEIGHT

    const sorted = sortedRowsRef.current
    const tks = tasksRef.current

    let y = 0
    for (const row of sorted) {
      const rowTasks = tks.filter((t) => t.rowId === row.id)
      const numLanes = Math.max(1, getSubLaneCount(rowTasks))
      const h = numLanes * ROW_HEIGHT
      if (relY >= y && relY < y + h) return row.id
      y += h
    }
    // Clamp to first / last row
    if (relY < 0 && sorted.length > 0) return sorted[0].id
    if (sorted.length > 0) return sorted[sorted.length - 1].id
    return null
  }, []) // intentionally empty — reads from refs

  const getRowIdFromClientYRef = useRef(getRowIdFromClientY)
  getRowIdFromClientYRef.current = getRowIdFromClientY

  // ---------------------------------------------------------------------------
  // Global pointer listeners for move-drag
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      const ms = moveStateRef.current
      if (!ms || e.pointerId !== ms.pointerId) return

      // 1. Move the clone container (bar + date label move together)
      if (cloneRef.current) {
        const x = e.clientX - ms.grabOffsetX
        const y = e.clientY - ms.grabOffsetY
        cloneRef.current.style.transform = `translate(${x}px, ${y}px)`
      }

      // 2. Update the date label text directly (no React re-render)
      if (dateLabelRef.current) {
        const dx = e.clientX - ms.startClientX
        const daysDelta = Math.round(dx / viewStateDayWidthRef.current)
        const newStart = addDays(parseDate(ms.task.startDate), daysDelta)
        const newEnd = addDays(parseDate(ms.task.endDate), daysDelta)
        dateLabelRef.current.textContent = `${format(newStart, 'MMM d')} → ${format(newEnd, 'MMM d')}`
      }

      // 3. Detect hovered row (lightweight — only setState when row changes)
      const rowId = getRowIdFromClientYRef.current(e.clientY)
      if (rowId) {
        if (rowId !== ms.currentRowId) {
          ms.currentRowId = rowId
          setDragTargetRowId(rowId)
        }
      }
    }

    function handlePointerUp(e: PointerEvent) {
      const ms = moveStateRef.current
      if (!ms || e.pointerId !== ms.pointerId) return

      const dx = e.clientX - ms.startClientX
      const daysDelta = Math.round(dx / viewStateDayWidthRef.current)
      const newStart = formatDate(addDays(parseDate(ms.task.startDate), daysDelta))
      const newEnd = formatDate(addDays(parseDate(ms.task.endDate), daysDelta))
      const newRowId = ms.currentRowId

      if (
        newStart !== ms.task.startDate ||
        newEnd !== ms.task.endDate ||
        newRowId !== ms.task.rowId
      ) {
        updateTask(ms.taskId, { startDate: newStart, endDate: newEnd, rowId: newRowId })
      }

      moveStateRef.current = null
      setMovingTaskId(null)
      setMoveClone(null)
      setDragTargetRowId(null)
    }

    function handlePointerCancel(e: PointerEvent) {
      const ms = moveStateRef.current
      if (!ms || e.pointerId !== ms.pointerId) return
      moveStateRef.current = null
      setMovingTaskId(null)
      setMoveClone(null)
      setDragTargetRowId(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
    }
  }, [updateTask]) // updateTask is stable from Zustand

  // ---------------------------------------------------------------------------
  // Move-drag start (called by TaskBar via onMoveStart prop)
  // ---------------------------------------------------------------------------
  const handleMoveStart = useCallback((
    taskId: string,
    e: React.PointerEvent,
    barEl: HTMLDivElement,
    originalClientX: number,
    originalClientY: number,
  ) => {
    const task = tasksRef.current.find((t) => t.id === taskId)
    if (!task) return

    const barRect = barEl.getBoundingClientRect()
    const grabOffsetX = originalClientX - barRect.left
    const grabOffsetY = originalClientY - barRect.top
    const startClientX = originalClientX
    const initialX = e.clientX - grabOffsetX
    const initialY = e.clientY - grabOffsetY

    moveStateRef.current = {
      taskId,
      task,
      startClientX,
      grabOffsetX,
      grabOffsetY,
      barWidth: barRect.width,
      pointerId: e.pointerId,
      currentRowId: task.rowId,
    }

    // Trigger React render to mount DragClone (the clone will appear at initialX/Y)
    setMovingTaskId(taskId)
    setDragTargetRowId(task.rowId)
    setMoveClone({
      task,
      barWidth: barRect.width,
      initialX,
      initialY,
    })

    // Set initial date label text
    requestAnimationFrame(() => {
      if (dateLabelRef.current) {
        const start = parseDate(task.startDate)
        const end = parseDate(task.endDate)
        dateLabelRef.current.textContent = `${format(start, 'MMM d')} → ${format(end, 'MMM d')}`
      }
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Derived layout values
  // ---------------------------------------------------------------------------
  const totalWidth = getTotalWidth(viewState.startDate, viewState.endDate, viewState.dayWidth)

  const rowYPositions = new Map<string, number>()
  let totalHeight = 0
  for (const row of sortedRows) {
    rowYPositions.set(row.id, totalHeight)
    const rowTasks = tasks.filter((t) => t.rowId === row.id)
    const numLanes = Math.max(1, getSubLaneCount(rowTasks))
    totalHeight += numLanes * ROW_HEIGHT
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>
        <Toolbar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="14" width="28" height="8" rx="4" fill={theme.border} />
            <rect x="16" y="27" width="28" height="8" rx="4" fill="#55F366" opacity="0.4" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: theme.text, marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>No lanes yet</div>
            <div style={{ fontSize: 13, color: theme.textMuted, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>Click <strong style={{ color: theme.text }}>Add Lane</strong> in the toolbar to get started.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: theme.bg,
      }}
    >
      <Toolbar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* ---------------------------------------------------------------- */}
        {/* Main scrollable container */}
        {/* ---------------------------------------------------------------- */}
        <div
          ref={scrollRef}
          className="gantt-scroll"
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            minWidth: 0,
          }}
        >
          {/* Timeline header — sticky top */}
          <TimelineHeader viewState={viewState} totalWidth={totalWidth} />

          {/* Content rows — sticky left panel + chart area */}
          <div style={{ display: 'flex', minWidth: LEFT_PANEL_WIDTH + totalWidth, minHeight: `calc(100% - ${HEADER_HEIGHT}px)`, alignItems: 'stretch' }}>
            {/* Left panel — row names */}
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 20,
                flexShrink: 0,
                background: theme.surface,
                borderRight: `1px solid ${theme.border}`,
              }}
            >
              <RowPanel rows={rows} tasks={tasks} />
            </div>

            {/* Chart canvas */}
            <ChartArea
              tasks={tasks}
              rows={rows}
              viewState={viewState}
              selectedTaskId={selectedTaskId}
              onSelectTask={selectTask}
              totalWidth={totalWidth}
              rowYPositions={rowYPositions}
              totalHeight={totalHeight}
              movingTaskId={movingTaskId}
              dragTargetRowId={dragTargetRowId}
              onMoveStart={handleMoveStart}
            >
              {/* Dependency arrows */}
              <DependencyLayer
                tasks={tasks}
                dependencies={dependencies}
                viewState={viewState}
                rowYPositions={rowYPositions}
                totalWidth={totalWidth}
                totalHeight={totalHeight}
                selectedTaskId={selectedTaskId}
              />

              {/* Divider markers */}
              <DividerLayer
                dividers={dividers}
                viewState={viewState}
                totalHeight={totalHeight}
              />
            </ChartArea>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Side panel */}
        {/* ---------------------------------------------------------------- */}
        {sidePanelOpen && selectedTaskId && (
          <TaskSidePanel
            taskId={selectedTaskId}
            onClose={() => {
              setSidePanelOpen(false)
              selectTask(null)
            }}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Floating drag clone — portal to document.body, 60fps via ref       */}
      {/* ------------------------------------------------------------------ */}
      {moveClone && (
        <DragClone
          task={moveClone.task}
          width={moveClone.barWidth}
          initialX={moveClone.initialX}
          initialY={moveClone.initialY}
          cloneRef={cloneRef}
          dateLabelRef={dateLabelRef}
        />
      )}
    </div>
  )
}
