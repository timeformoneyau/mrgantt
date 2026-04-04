'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { Task } from '@/types'
import { TASK_HEIGHT } from '@/lib/timeline'
import { getContrastColor } from '@/lib/colors'
import { useTheme } from '@/lib/theme'

interface DragCloneProps {
  task: Task
  /** Pixel width of the original task bar */
  width: number
  /** Initial bar left (barRect.left) */
  initialX: number
  /** Initial bar top (barRect.top) */
  initialY: number
  /**
   * Ref to the outer container. Parent updates only this element's `transform`
   * and both bar + date label move together.
   */
  cloneRef: React.RefObject<HTMLDivElement | null>
  /** Ref to the date label span so parent can set its textContent directly. */
  dateLabelRef: React.RefObject<HTMLSpanElement | null>
}

export function DragClone({ task, width, initialX, initialY, cloneRef, dateLabelRef }: DragCloneProps) {
  const theme = useTheme()
  const textColor = getContrastColor(task.color)

  if (typeof document === 'undefined') return null

  const initials = task.owner
    ? task.owner.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : null

  return createPortal(
    /*
     * Single outer container — only this element's `transform` is updated at
     * 60fps by the parent. Overflow visible lets the date label protrude above.
     */
    <div
      ref={cloneRef as React.RefObject<HTMLDivElement>}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width,
        height: TASK_HEIGHT,
        transform: `translate(${initialX}px, ${initialY}px)`,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'transform',
        userSelect: 'none',
      }}
    >
      {/* Date tooltip — floats above the bar */}
      <div style={{
        position: 'absolute',
        bottom: TASK_HEIGHT + 5,
        left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span
          ref={dateLabelRef as React.RefObject<HTMLSpanElement>}
          style={{
            background: '#000404',
            color: '#FBF9F3',
            fontSize: 10, fontWeight: 600,
            fontFamily: "'Poppins', Arial, sans-serif",
            padding: '2px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        />
      </div>

      {/* The visual bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0,
        width: '100%', height: TASK_HEIGHT,
        background: task.color,
        borderRadius: 5,
        border: `1px solid ${theme.taskBorder}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: initials ? 36 : 10,
        overflow: 'hidden',
        boxShadow: '0 8px 28px rgba(0,0,0,0.30)',
        opacity: 0.93,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600,
          fontFamily: "'Poppins', Arial, sans-serif",
          color: textColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1,
        }}>
          {task.title}
        </span>

        {initials && (
          <div style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 18, borderRadius: '50%',
            background: 'rgba(0,0,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, letterSpacing: '-0.5px',
            fontFamily: "'Poppins', Arial, sans-serif",
            color: textColor, flexShrink: 0,
          }}>
            {initials}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
