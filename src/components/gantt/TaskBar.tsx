'use client'

import React, { useRef, useState, useCallback } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import { Task, ViewState } from '@/types'
import {
  dateToX, xToDate, ROW_HEIGHT, TASK_HEIGHT, TASK_TOP_OFFSET,
  parseDate, formatDate,
} from '@/lib/timeline'
import { getContrastColor } from '@/lib/colors'
import { useGanttStore } from '@/store/ganttStore'

interface TaskBarProps {
  task: Task
  subLane: number
  viewState: ViewState
  isSelected: boolean
  isDragging?: boolean
  isGhost?: boolean
  onSelect: (id: string) => void
}

type DragType = 'move' | 'resize-left' | 'resize-right'

interface DragState {
  type: DragType
  pointerId: number
  startX: number
  originalStartDate: string
  originalEndDate: string
  currentStartDate: string
  currentEndDate: string
}

export function TaskBar({ task, subLane, viewState, isSelected, isDragging = false, isGhost = false, onSelect }: TaskBarProps) {
  const updateTask = useGanttStore((s) => s.updateTask)
  const dragRef = useRef<DragState | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [dragPreview, setDragPreview] = useState<{ startDate: string; endDate: string } | null>(null)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineTitle, setInlineTitle] = useState(task.title)

  const { dayWidth, startDate: viewStart } = viewState
  const displayStart = dragPreview?.startDate ?? task.startDate
  const displayEnd = dragPreview?.endDate ?? task.endDate

  const left = dateToX(displayStart, viewStart, dayWidth)
  const right = dateToX(displayEnd, viewStart, dayWidth) + dayWidth
  const width = Math.max(right - left, dayWidth)
  const top = subLane * ROW_HEIGHT + TASK_TOP_OFFSET

  const textColor = getContrastColor(task.color)
  const isCurrentlyDragging = dragRef.current !== null || isDragging

  const startDrag = useCallback((e: React.PointerEvent, type: DragType) => {
    if (isInlineEditing) return
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      type, pointerId: e.pointerId, startX: e.clientX,
      originalStartDate: task.startDate, originalEndDate: task.endDate,
      currentStartDate: task.startDate, currentEndDate: task.endDate,
    }
  }, [task.startDate, task.endDate, isInlineEditing])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const daysDelta = Math.round(dx / dayWidth)
    const origStart = parseDate(drag.originalStartDate)
    const origEnd = parseDate(drag.originalEndDate)

    let newStart: Date, newEnd: Date
    if (drag.type === 'move') {
      newStart = addDays(origStart, daysDelta)
      newEnd = addDays(origEnd, daysDelta)
    } else if (drag.type === 'resize-left') {
      newStart = addDays(origStart, daysDelta)
      newEnd = origEnd
      if (differenceInDays(newEnd, newStart) < 0) newStart = newEnd
    } else {
      newStart = origStart
      newEnd = addDays(origEnd, daysDelta)
      if (differenceInDays(newEnd, newStart) < 0) newEnd = newStart
    }

    const ns = formatDate(newStart), ne = formatDate(newEnd)
    drag.currentStartDate = ns
    drag.currentEndDate = ne
    setDragPreview({ startDate: ns, endDate: ne })
  }, [dayWidth])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    if (drag.currentStartDate !== drag.originalStartDate || drag.currentEndDate !== drag.originalEndDate) {
      updateTask(task.id, { startDate: drag.currentStartDate, endDate: drag.currentEndDate })
    }
    dragRef.current = null
    setDragPreview(null)
  }, [task.id, updateTask])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsInlineEditing(true)
    setInlineTitle(task.title)
  }

  const commitInlineEdit = () => {
    if (inlineTitle.trim() && inlineTitle !== task.title) updateTask(task.id, { title: inlineTitle.trim() })
    setIsInlineEditing(false)
  }

  // Selection ring uses Tiimely Green
  const selectionShadow = isSelected
    ? `0 0 0 2px #FBF9F3, 0 0 0 3.5px #55F366`
    : '0 1px 3px rgba(0,4,4,0.10)'

  return (
    <div
      ref={barRef}
      data-task-bar="true"
      className="task-bar no-select"
      onClick={(e) => { e.stopPropagation(); if (!isCurrentlyDragging) onSelect(task.id) }}
      onDoubleClick={handleDoubleClick}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute', left, top, width, height: TASK_HEIGHT,
        background: task.color,
        borderRadius: 5,
        cursor: isCurrentlyDragging ? 'grabbing' : 'grab',
        boxShadow: selectionShadow,
        opacity: isGhost ? 0.3 : isCurrentlyDragging ? 0.9 : 1,
        zIndex: isSelected ? 20 : isCurrentlyDragging ? 25 : 10,
        display: 'flex', alignItems: 'center',
        overflow: 'visible',
        border: '1px solid rgba(0,4,4,0.08)',
        transition: isCurrentlyDragging ? 'none' : 'box-shadow 0.12s',
      }}
    >
      {/* Left resize handle */}
      <ResizeHandle
        side="left"
        onPointerDown={(e) => startDrag(e, 'resize-left')}
        isVisible={isSelected || isCurrentlyDragging}
        color={textColor}
      />

      {/* Drag body */}
      <div
        onPointerDown={(e) => startDrag(e, 'move')}
        style={{
          flex: 1, height: '100%',
          display: 'flex', alignItems: 'center',
          padding: '0 10px', overflow: 'hidden',
          cursor: isCurrentlyDragging ? 'grabbing' : 'grab',
        }}
      >
        {isInlineEditing ? (
          <input
            autoFocus value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            onBlur={commitInlineEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setIsInlineEditing(false) }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: textColor, fontSize: 12, fontWeight: 600,
              fontFamily: "'Poppins', Arial, sans-serif",
              width: '100%', padding: 0,
            }}
          />
        ) : (
          <span
            title={task.title}
            style={{
              fontSize: 12, fontWeight: 600,
              fontFamily: "'Poppins', Arial, sans-serif",
              color: textColor,
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: width > 60 ? 'ellipsis' : 'clip',
              opacity: width < 28 ? 0 : 1,
              pointerEvents: 'none',
            }}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Right resize handle */}
      <ResizeHandle
        side="right"
        onPointerDown={(e) => startDrag(e, 'resize-right')}
        isVisible={isSelected || isCurrentlyDragging}
        color={textColor}
      />

      {/* Date tooltip while dragging */}
      {isCurrentlyDragging && dragPreview && (
        <div style={{
          position: 'absolute',
          bottom: TASK_HEIGHT + 6,
          left: '50%', transform: 'translateX(-50%)',
          background: '#000404', color: '#FBF9F3',
          fontSize: 11, fontWeight: 500,
          fontFamily: "'Poppins', Arial, sans-serif",
          padding: '3px 8px', borderRadius: 5,
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
        }}>
          {format(parseDate(dragPreview.startDate), 'MMM d')} → {format(parseDate(dragPreview.endDate), 'MMM d')}
        </div>
      )}
    </div>
  )
}

function ResizeHandle({ side, onPointerDown, isVisible, color }: {
  side: 'left' | 'right'; onPointerDown: (e: React.PointerEvent) => void; isVisible: boolean; color: string
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute', [side]: 0, top: 0,
        width: 8, height: '100%',
        cursor: 'ew-resize',
        borderRadius: side === 'left' ? '5px 0 0 5px' : '0 5px 5px 0',
        background: 'rgba(0,0,0,0.1)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.1s',
        zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ width: 2, height: 10, background: color === 'white' ? 'rgba(255,255,255,0.5)' : 'rgba(0,4,4,0.25)', borderRadius: 1 }} />
    </div>
  )
}
