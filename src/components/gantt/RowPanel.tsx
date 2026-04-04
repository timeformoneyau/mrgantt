'use client'

import React, { useState } from 'react'
import { Row, Task } from '@/types'
import { ROW_HEIGHT, LEFT_PANEL_WIDTH } from '@/lib/timeline'
import { getSubLaneCount } from '@/lib/taskLayout'
import { useGanttStore } from '@/store/ganttStore'
import { useTheme } from '@/lib/theme'

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
  const theme = useTheme()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(row.name)
  const [hovered, setHovered] = useState(false)

  function commit() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== row.name) updateRow(row.id, { name: trimmed })
    else setName(row.name)
    setEditing(false)
  }

  const isSystem = row.isSystem === true

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: rowHeight,
        display: 'flex',
        alignItems: 'flex-start',
        padding: '11px 14px 0 0',
        // System rows get a very subtle tinted background
        background: isSystem
          ? theme.isDark ? 'rgba(85,243,102,0.04)' : 'rgba(85,243,102,0.04)'
          : theme.surface,
        borderRight: `1px solid ${theme.border}`,
        borderBottom: `1px solid ${theme.borderSubtle}`,
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
        background: isSystem
          ? 'rgba(85,243,102,0.35)'  // always slightly visible for system row
          : hovered ? '#55F366' : 'transparent',
        transition: 'background 0.15s',
        borderRadius: '0 2px 2px 0',
      }} />

      <div style={{ flex: 1, minWidth: 0, paddingLeft: 14 }}>
        {editing && !isSystem ? (
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
              outline: 'none', background: theme.inputBg,
              boxSizing: 'border-box', color: theme.text,
            }}
          />
        ) : (
          <span
            onDoubleClick={() => { if (!isSystem) { setEditing(true); setName(row.name) } }}
            title={isSystem ? 'Staging lane — drag tasks here to unassign' : 'Double-click to rename'}
            style={{
              fontSize: 12, fontWeight: isSystem ? 500 : 600,
              fontFamily: "'Poppins', Arial, sans-serif",
              fontStyle: isSystem ? 'italic' : 'normal',
              color: isSystem ? theme.textMuted : theme.text,
              cursor: isSystem ? 'default' : 'text',
              display: 'block',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {row.name}
          </span>
        )}
      </div>

      {/* Actions on hover — system rows have no controls */}
      {hovered && !editing && !isSystem && (
        <div style={{ display: 'flex', gap: 1, paddingLeft: 6, flexShrink: 0 }}>
          <IconBtn onClick={() => moveRowUp(row.id)} title="Move up" theme={theme}>↑</IconBtn>
          <IconBtn onClick={() => moveRowDown(row.id)} title="Move down" theme={theme}>↓</IconBtn>
          <IconBtn
            onClick={() => {
              if (confirm(`Delete lane "${row.name}"? All tasks in this lane will be removed.`)) deleteRow(row.id)
            }}
            title="Delete lane" danger theme={theme}
          >×</IconBtn>
        </div>
      )}
    </div>
  )
}

function IconBtn({ onClick, title, children, danger = false, theme }: {
  onClick: () => void; title: string; children: React.ReactNode; danger?: boolean; theme: ReturnType<typeof useTheme>
}) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        width: 20, height: 20, border: 'none', borderRadius: 4,
        background: 'transparent', cursor: 'pointer',
        fontSize: 12, color: danger ? theme.text : theme.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, lineHeight: 1, fontFamily: "'Poppins', Arial, sans-serif",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme.borderSubtle }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
