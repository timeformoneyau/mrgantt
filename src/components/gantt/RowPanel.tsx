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
        return <RowNameCell key={row.id} row={row} rowHeight={numLanes * ROW_HEIGHT} />
      })}
    </div>
  )
}

function RowNameCell({ row, rowHeight }: { row: Row; rowHeight: number }) {
  const { updateRow, deleteRow, moveRowUp, moveRowDown } = useGanttStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(row.name)
  const [hovered, setHovered] = useState(false)

  function commit() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== row.name) updateRow(row.id, { name: trimmed })
    else setName(row.name)
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
        padding: '11px 14px 0 0',
        background: '#FFFFFF',
        borderRight: '1px solid #E8E6DE',
        borderBottom: '1px solid #F0EEE8',
        width: LEFT_PANEL_WIDTH,
        minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Tiimely Green accent bar on left edge */}
      <div style={{
        width: 3,
        height: rowHeight,
        position: 'absolute',
        left: 0, top: 0,
        background: hovered ? '#55F366' : 'transparent',
        transition: 'background 0.15s',
        borderRadius: '0 2px 2px 0',
      }} />

      <div style={{ flex: 1, minWidth: 0, paddingLeft: 14 }}>
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
              width: '100%', border: '1px solid #55F366', borderRadius: 5,
              padding: '2px 7px', fontSize: 12, fontWeight: 600,
              fontFamily: "'Poppins', Arial, sans-serif",
              outline: 'none', background: '#fff',
              boxSizing: 'border-box', color: '#000404',
            }}
          />
        ) : (
          <span
            onDoubleClick={() => { setEditing(true); setName(row.name) }}
            title="Double-click to rename"
            style={{
              fontSize: 12, fontWeight: 600,
              fontFamily: "'Poppins', Arial, sans-serif",
              color: '#000404',
              cursor: 'text',
              display: 'block',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {row.name}
          </span>
        )}
      </div>

      {/* Actions on hover */}
      {hovered && !editing && (
        <div style={{ display: 'flex', gap: 1, paddingLeft: 6, flexShrink: 0 }}>
          <IconBtn onClick={() => moveRowUp(row.id)} title="Move up">↑</IconBtn>
          <IconBtn onClick={() => moveRowDown(row.id)} title="Move down">↓</IconBtn>
          <IconBtn
            onClick={() => {
              if (confirm(`Delete lane "${row.name}"? All tasks in this lane will be removed.`)) deleteRow(row.id)
            }}
            title="Delete lane" danger
          >×</IconBtn>
        </div>
      )}
    </div>
  )
}

function IconBtn({ onClick, title, children, danger = false }: {
  onClick: () => void; title: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        width: 20, height: 20, border: 'none', borderRadius: 4,
        background: 'transparent', cursor: 'pointer',
        fontSize: 12, color: danger ? '#000404' : '#B0AEA5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, lineHeight: 1, fontFamily: "'Poppins', Arial, sans-serif",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? 'rgba(0,4,4,0.08)' : '#F0EEE8' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
