'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useGanttStore } from '@/store/ganttStore'
import { Toolbar } from '@/components/ui/Toolbar'
import { TimelineHeader } from './TimelineHeader'
import { ChartArea } from './ChartArea'
import { RowPanel } from './RowPanel'
import { DependencyLayer } from './DependencyLayer'
import { DividerLayer } from './DividerLayer'
import { TaskSidePanel } from './TaskSidePanel'
import {
  getTotalWidth,
  LEFT_PANEL_WIDTH,
  ROW_HEIGHT,
  dateToX,
  parseDate,
} from '@/lib/timeline'
import { getSubLaneCount } from '@/lib/taskLayout'

export function GanttChart() {
  const {
    tasks, rows, dividers, dependencies,
    viewState, selectedTaskId, sidePanelOpen,
    selectTask, setSidePanelOpen,
    undo, redo,
  } = useGanttStore()

  const scrollRef = useRef<HTMLDivElement>(null)

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
      } else if (e.key === 'Escape') {
        selectTask(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo, selectTask])

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

  // Derived layout values
  const sortedRows = [...rows].sort((a, b) => a.order - b.order)
  const totalWidth = getTotalWidth(viewState.startDate, viewState.endDate, viewState.dayWidth)

  // Compute row y positions and total height
  const rowYPositions = new Map<string, number>()
  let totalHeight = 0
  for (const row of sortedRows) {
    rowYPositions.set(row.id, totalHeight)
    const rowTasks = tasks.filter((t) => t.rowId === row.id)
    const numLanes = Math.max(1, getSubLaneCount(rowTasks))
    totalHeight += numLanes * ROW_HEIGHT
  }

  // Empty state
  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Toolbar />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            gap: 16,
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="14" width="28" height="8" rx="4" fill="#e5e7eb" />
            <rect x="16" y="27" width="28" height="8" rx="4" fill="#e5e7eb" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 4 }}>No lanes yet</div>
            <div style={{ fontSize: 13 }}>Click <strong>Add Lane</strong> in the toolbar to get started.</div>
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
        background: '#f8f9fa',
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

          {/* Content rows — sticky left panel cells + chart area */}
          <div style={{ display: 'flex', minWidth: LEFT_PANEL_WIDTH + totalWidth }}>
            {/* Left panel — row names */}
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 20,
                flexShrink: 0,
                background: '#fff',
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
            >
              {/* Dependency arrows — rendered as SVG overlay */}
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
    </div>
  )
}
