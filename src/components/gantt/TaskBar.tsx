'use client'

import React, { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { format, addDays, differenceInDays } from 'date-fns'
import { Task, ViewState } from '@/types'
import {
  dateToX, ROW_HEIGHT, TASK_HEIGHT, TASK_TOP_OFFSET,
  parseDate, formatDate,
} from '@/lib/timeline'
import { getContrastColor } from '@/lib/colors'
import { useGanttStore } from '@/store/ganttStore'
import { useTheme } from '@/lib/theme'

const MOVE_THRESHOLD = 5 // pixels before move drag commits

interface TaskBarProps {
  task: Task
  subLane: number
  viewState: ViewState
  isSelected: boolean
  isMovePlaceholder?: boolean
  totalWidth?: number
  onMoveStart?: (
    taskId: string,
    e: React.PointerEvent,
    barEl: HTMLDivElement,
    originalClientX: number,
    originalClientY: number,
  ) => void
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

interface PendingMove {
  startX: number
  startY: number
  pointerId: number
  committed: boolean
}

export function TaskBar({
  task, subLane, viewState, isSelected,
  isMovePlaceholder = false,
  totalWidth,
  onMoveStart,
  onSelect,
}: TaskBarProps) {
  const updateTask = useGanttStore((s) => s.updateTask)
  const theme = useTheme()
  const dragRef = useRef<DragState | null>(null)
  const pendingMoveRef = useRef<PendingMove | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [dragPreview, setDragPreview] = useState<{ startDate: string; endDate: string } | null>(null)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineTitle, setInlineTitle] = useState(task.title)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; barBottom: number } | null>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { dayWidth, startDate: viewStart } = viewState
  const displayStart = dragPreview?.startDate ?? task.startDate
  const displayEnd = dragPreview?.endDate ?? task.endDate

  const rawLeft = dateToX(displayStart, viewStart, dayWidth)
  const rawRight = dateToX(displayEnd, viewStart, dayWidth) + dayWidth

  // Clipping: clamp to timeline boundaries
  const isClippedLeft = rawLeft < 0
  const isClippedRight = totalWidth !== undefined && rawRight > totalWidth
  const left = Math.max(0, rawLeft)
  const right = totalWidth !== undefined ? Math.min(rawRight, totalWidth) : rawRight
  const width = Math.max(right - left, isClippedLeft || isClippedRight ? 8 : dayWidth)
  const top = subLane * ROW_HEIGHT + TASK_TOP_OFFSET

  const textColor = getContrastColor(task.color)
  const isCurrentlyDragging = dragRef.current !== null
  const showOwnerChip = Boolean(task.owner) && width > 80
  const ownerInitials = task.owner
    ? task.owner.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : ''

  const clearTooltip = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setTooltipPos(null)
  }, [])

  const startDrag = useCallback((e: React.PointerEvent, type: DragType) => {
    if (isInlineEditing) return
    e.stopPropagation()
    e.preventDefault()
    clearTooltip()

    if (type === 'move') {
      // Capture pointer but wait for threshold before committing
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      pendingMoveRef.current = {
        startX: e.clientX, startY: e.clientY,
        pointerId: e.pointerId, committed: false,
      }
      return
    }

    // Resize: commit immediately
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      type, pointerId: e.pointerId, startX: e.clientX,
      originalStartDate: task.startDate, originalEndDate: task.endDate,
      currentStartDate: task.startDate, currentEndDate: task.endDate,
    }
  }, [task.startDate, task.endDate, isInlineEditing, clearTooltip])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    // --- Pending move: check threshold ---
    const pending = pendingMoveRef.current
    if (pending && !pending.committed) {
      const dx = Math.abs(e.clientX - pending.startX)
      const dy = Math.abs(e.clientY - pending.startY)
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        pending.committed = true
        if (onMoveStart && barRef.current) {
          // Hand off to parent for cross-lane floating drag
          onMoveStart(task.id, e, barRef.current, pending.startX, pending.startY)
          return
        }
        // No parent handler: fall back to local horizontal move
        dragRef.current = {
          type: 'move', pointerId: pending.pointerId,
          startX: pending.startX,
          originalStartDate: task.startDate, originalEndDate: task.endDate,
          currentStartDate: task.startDate, currentEndDate: task.endDate,
        }
      }
      // If committed with onMoveStart, parent handles everything
      if (pending.committed && onMoveStart) return
    }

    // --- Local drag (resize or fallback horizontal move) ---
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
  }, [dayWidth, task.startDate, task.endDate, task.id, onMoveStart])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    // Clear pending move (click: onClick will call onSelect; drag: parent's window handler commits)
    const pending = pendingMoveRef.current
    if (pending) {
      pendingMoveRef.current = null
      // If committed with parent handler, parent's window pointerup commits the drop
      if (pending.committed && onMoveStart) return
      // If committed with local drag, fall through to dragRef handling
      if (!pending.committed) return // onClick fires next and calls onSelect
    }

    // Local drag commit (resize or local move)
    const drag = dragRef.current
    if (!drag) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    if (drag.currentStartDate !== drag.originalStartDate || drag.currentEndDate !== drag.originalEndDate) {
      updateTask(task.id, { startDate: drag.currentStartDate, endDate: drag.currentEndDate })
    }
    dragRef.current = null
    setDragPreview(null)
  }, [task.id, updateTask, onMoveStart])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (dragRef.current || pendingMoveRef.current || isMovePlaceholder) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top, barBottom: rect.bottom })
    }, 280)
  }, [isMovePlaceholder])

  const handleMouseLeave = useCallback(() => {
    clearTooltip()
  }, [clearTooltip])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearTooltip()
    setIsInlineEditing(true)
    setInlineTitle(task.title)
  }

  const commitInlineEdit = () => {
    if (inlineTitle.trim() && inlineTitle !== task.title) updateTask(task.id, { title: inlineTitle.trim() })
    setIsInlineEditing(false)
  }

  const selectionShadow = isSelected
    ? `0 0 0 2px ${theme.surface}, 0 0 0 3.5px #55F366`
    : undefined

  // --- Placeholder mode ---
  if (isMovePlaceholder) {
    return (
      <div style={{
        position: 'absolute', left: rawLeft, top, width: Math.max(rawRight - rawLeft, dayWidth), height: TASK_HEIGHT,
        background: task.color,
        borderRadius: 5,
        opacity: 0.18,
        pointerEvents: 'none',
        zIndex: 8,
        border: `1px dashed ${task.color}`,
      }} />
    )
  }

  return (
    <>
      <div
        ref={barRef}
        data-task-bar="true"
        className="task-bar no-select"
        onClick={(e) => { e.stopPropagation(); if (!isCurrentlyDragging) onSelect(task.id) }}
        onDoubleClick={handleDoubleClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute', left, top, width, height: TASK_HEIGHT,
          background: task.color,
          borderRadius: isClippedLeft && isClippedRight ? 0 : isClippedLeft ? '0 5px 5px 0' : isClippedRight ? '5px 0 0 5px' : 5,
          cursor: isCurrentlyDragging ? 'grabbing' : 'grab',
          boxShadow: selectionShadow,
          opacity: isCurrentlyDragging ? 0.9 : 1,
          zIndex: isSelected ? 20 : isCurrentlyDragging ? 25 : 10,
          display: 'flex', alignItems: 'center',
          overflow: 'visible',
          border: `1px solid ${theme.taskBorder}`,
          transition: isCurrentlyDragging ? 'none' : 'box-shadow 0.12s',
        }}
      >
        {/* Left clip indicator */}
        {isClippedLeft && (
          <div style={{
            position: 'absolute', left: 0, top: 0,
            width: Math.min(28, width), height: '100%',
            background: 'linear-gradient(to right, rgba(0,0,0,0.28), transparent)',
            borderRadius: '0 0 0 0',
            pointerEvents: 'none', zIndex: 4,
            display: 'flex', alignItems: 'center', paddingLeft: 4,
          }}>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.85)', fontWeight: 700, lineHeight: 1 }}>◄</span>
          </div>
        )}

        {/* Right clip indicator */}
        {isClippedRight && (
          <div style={{
            position: 'absolute', right: 0, top: 0,
            width: Math.min(28, width), height: '100%',
            background: 'linear-gradient(to left, rgba(0,0,0,0.28), transparent)',
            pointerEvents: 'none', zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4,
          }}>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.85)', fontWeight: 700, lineHeight: 1 }}>►</span>
          </div>
        )}

        {/* Left resize handle */}
        <ResizeHandle
          side="left"
          onPointerDown={(e) => startDrag(e, 'resize-left')}
          isVisible={isSelected || isCurrentlyDragging}
          color={textColor}
        />

        {/* Drag / title body */}
        <div
          onPointerDown={(e) => startDrag(e, 'move')}
          style={{
            flex: 1, height: '100%',
            display: 'flex', alignItems: 'center',
            paddingLeft: isClippedLeft ? 14 : 10,
            paddingRight: showOwnerChip ? 36 : 10,
            overflow: 'hidden',
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
                background: 'transparent', border: 'none',
                outline: '1.5px solid rgba(85,243,102,0.7)',
                outlineOffset: 2, borderRadius: 3,
                color: textColor, fontSize: 12, fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                width: '100%', padding: '0 2px',
              }}
            />
          ) : (
            <span style={{
              fontSize: 12, fontWeight: 600,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              color: textColor,
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: width > 60 ? 'ellipsis' : 'clip',
              opacity: width < 28 ? 0 : 1,
              pointerEvents: 'none',
            }}>
              {task.title}
            </span>
          )}
        </div>

        {/* Owner chip */}
        {showOwnerChip && (
          <div style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 18, borderRadius: '50%',
            background: 'rgba(0,0,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, letterSpacing: '-0.5px',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            color: textColor, flexShrink: 0,
            pointerEvents: 'none', zIndex: 3,
          }}>
            {ownerInitials}
          </div>
        )}

        {/* Right resize handle */}
        <ResizeHandle
          side="right"
          onPointerDown={(e) => startDrag(e, 'resize-right')}
          isVisible={isSelected || isCurrentlyDragging}
          color={textColor}
        />

        {/* Date tooltip while resize-dragging */}
        {isCurrentlyDragging && dragPreview && (
          <div style={{
            position: 'absolute',
            bottom: TASK_HEIGHT + 6,
            left: '50%', transform: 'translateX(-50%)',
            background: '#000404', color: '#FBF9F3',
            fontSize: 11, fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            padding: '3px 8px', borderRadius: 5,
            whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
          }}>
            {format(parseDate(dragPreview.startDate), 'MMM d')} → {format(parseDate(dragPreview.endDate), 'MMM d')}
          </div>
        )}
      </div>

      {/* Rich hover tooltip */}
      {tooltipPos && (
        <TaskTooltip task={task} x={tooltipPos.x} y={tooltipPos.y} barBottom={tooltipPos.barBottom} />
      )}
    </>
  )
}

function TaskTooltip({ task, x, y, barBottom }: { task: Task; x: number; y: number; barBottom: number }) {
  const start = parseDate(task.startDate)
  const end = parseDate(task.endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const duration = differenceInDays(end, start) + 1

  let remainingLabel: string
  let remainingColor: string
  if (today < start) {
    const d = differenceInDays(start, today)
    remainingLabel = `Starts in ${d} day${d !== 1 ? 's' : ''}`
    remainingColor = '#B0AEA5'
  } else if (today > end) {
    remainingLabel = 'Ended'
    remainingColor = '#B0AEA5'
  } else {
    const rem = differenceInDays(end, today) + 1
    remainingLabel = `${rem} day${rem !== 1 ? 's' : ''} remaining`
    remainingColor = '#55F366'
  }

  const tooltipHeight = task.description ? 135 : 108
  const showAbove = y - tooltipHeight - 10 >= 0
  const tooltipTop = showAbove ? y - tooltipHeight - 8 : barBottom + 8
  const tooltipLeft = Math.max(6, Math.min(x - 115, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 240))

  if (typeof document === 'undefined') return null

  return createPortal(
    <div style={{
      position: 'fixed',
      left: tooltipLeft,
      top: tooltipTop,
      width: 228,
      background: '#000404',
      color: '#FBF9F3',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 11,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      zIndex: 99998,
      pointerEvents: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      lineHeight: 1.55,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 12, color: '#FBF9F3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </span>
      </div>

      {task.owner && (
        <div style={{ color: '#B0AEA5', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10 }}>👤</span>
          <span>{task.owner}</span>
        </div>
      )}

      <div style={{ color: '#B0AEA5', marginBottom: 2 }}>
        {format(start, 'MMM d')} → {format(end, 'MMM d, yyyy')}
      </div>

      <div style={{ color: '#B0AEA5', marginBottom: 4 }}>
        {duration} day{duration !== 1 ? 's' : ''}
      </div>

      <div style={{ color: remainingColor, fontWeight: 600, fontSize: 10 }}>
        {remainingLabel}
      </div>

      <div style={{
        color: task.description ? '#B0AEA5' : 'rgba(176,174,165,0.45)',
        marginTop: 7, fontSize: 10,
        borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 7,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        fontStyle: task.description ? 'normal' : 'italic',
      }}>
        {task.description || 'No description'}
      </div>
    </div>,
    document.body,
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
