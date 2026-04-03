'use client'

import React, { useState } from 'react'
import { Row, Task } from '@/types'
import { ROW_HEIGHT, LEFT_PANEL_WIDTH } from '@/lib/timeline'
import { getSubLaneCount } from '@/lib/taskLayout'
import { useGanttStore } from '@/store/ganttStore'

interface RowPanelProps {
  rows: Row[]
  tasks: Task[]
}

export function RowPanel({ rows, tasks }: RowPanelProps) {
  const sortedRows = [...rows].sort((a, b) => a.order - b.order)

  return (
    <div>
      {sortedRows.map((row) => {
        const rowTasks = tasks.filter((t) => t.rowId === row.id)
        const numLanes = Math.max(1, getSubLaneCount(rowTasks))
        const rowHeight = numLanes * ROW_HEIGHT

        return (
          <RowNameCell key={row.id} row={row} rowHeight={rowHeight} />
        )
      })}
    </div>
  )
}

interface RowNameCellProps {
  row: Row
  rowHeight: number
}

function RowNameCell({ row, rowHeight }: RowNameCellProps) {
  const { updateRow, deleteRow, moveRowUp, moveRowDown } = useGanttStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(row.name)
  const [hovered, setHovered] = useState(false)

  function commit() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== row.name) {
      updateRow(row.id, { name: trimmed })
    } else {
      setName(row.name) // revert
    }
    setEditing(false)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: rowHeight,
        display: 'flex',
        alignItems: 'flex-start',
        padding: '10px 14px 0',
        position: 'sticky',
        left: 0,
        zIndex: 20,
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #f3f4f6',
        width: LEFT_PANEL_WIDTH,
        minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box',
      }}
    >
      {/* Lane color indicator */}
      <div
        style={{
          width: 3,
          height: 18,
          borderRadius: 2,
          background: '#e5e7eb',
          marginRight: 8,
          marginTop: 1,
          flexShrink: 0,
        }}
      />

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setName(row.name); setEditing(false) }
            }}
            style={{
              width: '100%',
              border: '1px solid #6366f1',
              borderRadius: 5,
              padding: '2px 6px',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <span
            onDoubleClick={() => { setEditing(true); setName(row.name) }}
            title="Double-click to rename"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              cursor: 'text',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.name}
          </span>
        )}
      </div>

      {/* Row actions */}
      {hovered && !editing && (
        <div
          style={{
            display: 'flex',
            gap: 1,
            marginLeft: 4,
            flexShrink: 0,
          }}
        >
          <IconButton onClick={() => moveRowUp(row.id)} title="Move up">
            ↑
          </IconButton>
          <IconButton onClick={() => moveRowDown(row.id)} title="Move down">
            ↓
          </IconButton>
          <IconButton
            onClick={() => {
              if (confirm(`Delete lane "${row.name}"? All tasks in this lane will be removed.`)) {
                deleteRow(row.id)
              }
            }}
            title="Delete lane"
            danger
          >
            ×
          </IconButton>
        </div>
      )}
    </div>
  )
}

function IconButton({
  onClick, title, children, danger = false,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 20,
        height: 20,
        border: 'none',
        borderRadius: 4,
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 12,
        color: danger ? '#ef4444' : '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger ? '#fef2f2' : '#f3f4f6'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
