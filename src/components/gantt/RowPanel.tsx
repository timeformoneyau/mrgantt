'use client'

import React, { useRef, useEffect } from 'react'
import { Row, Task } from '@/types'
import { ROW_HEIGHT, GROUP_HEADER_HEIGHT, LEFT_PANEL_WIDTH } from '@/lib/timeline'
import { getSubLaneCount } from '@/lib/taskLayout'
import { sortedVisibleRows, isGroupRow, isSystemRow } from '@/lib/rowUtils'
import { useGanttStore } from '@/store/ganttStore'
import { useTheme } from '@/lib/theme'

interface RowPanelProps { rows: Row[]; tasks: Task[] }

export function RowPanel({ rows, tasks }: RowPanelProps) {
  const { addGroup, addLane, beginEditRow, editingRowId } = useGanttStore()
  const theme = useTheme()
  const visible = sortedVisibleRows(rows)

  return (
    <div style={{ width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH }}>
      {visible.map((row) => {
        if (isGroupRow(row)) {
          return (
            <GroupHeader
              key={row.id}
              row={row}
              isEditing={editingRowId === row.id}
              onAddLane={() => {
                const id = addLane({ groupId: row.id })
                beginEditRow(id)
              }}
            />
          )
        }
        const rowTasks = tasks.filter(t => t.rowId === row.id)
        const numLanes = Math.max(1, getSubLaneCount(rowTasks))
        return (
          <LaneRow
            key={row.id}
            row={row}
            rowHeight={numLanes * ROW_HEIGHT}
            isEditing={editingRowId === row.id}
          />
        )
      })}

      {/* Panel footer — add group button (outside synchronized area) */}
      <div style={{
        padding: '8px 14px',
        borderRight: `1px solid ${theme.border}`,
        borderBottom: `1px solid ${theme.borderSubtle}`,
      }}>
        <button
          onClick={() => addGroup()}
          aria-label="Add group"
          style={{
            width: '100%', padding: '6px 0',
            background: 'transparent',
            border: `1px dashed ${theme.border}`,
            borderRadius: 6,
            color: theme.textMuted,
            fontSize: 11, fontWeight: 600,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#55F366'; (e.currentTarget as HTMLElement).style.color = '#55F366' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = theme.border; (e.currentTarget as HTMLElement).style.color = theme.textMuted }}
        >
          + Add Group
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GroupHeader
// ---------------------------------------------------------------------------
function GroupHeader({ row, isEditing, onAddLane }: { row: Row; isEditing: boolean; onAddLane: () => void }) {
  const { updateRow, deleteRow, toggleGroup, endEditRow, newRowId } = useGanttStore()
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = React.useState(row.name)
  const [hovered, setHovered] = React.useState(false)

  useEffect(() => { setName(row.name) }, [row.name])

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isEditing])

  function commit() {
    const trimmed = name.trim()
    if (trimmed) updateRow(row.id, { name: trimmed })
    else setName(row.name)
    endEditRow()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { commit() }
    if (e.key === 'Escape') {
      if (!name.trim() && newRowId === row.id) { deleteRow(row.id); endEditRow(); return }
      setName(row.name); endEditRow()
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: GROUP_HEADER_HEIGHT,
        display: 'flex', alignItems: 'center',
        padding: '0 8px 0 6px',
        background: theme.isDark ? 'rgba(85,243,102,0.06)' : 'rgba(0,74,60,0.05)',
        borderRight: `1px solid ${theme.border}`,
        borderBottom: `1px solid ${theme.border}`,
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box', gap: 4,
      }}
    >
      {/* Collapse chevron */}
      <button
        onClick={() => toggleGroup(row.id)}
        aria-label={row.collapsed ? 'Expand group' : 'Collapse group'}
        style={{
          width: 18, height: 18, flexShrink: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.textMuted, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: row.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,3.5 5,6.5 8,3.5" />
        </svg>
      </button>

      {/* Name (inline edit or label) */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, minWidth: 0,
            border: '1px solid #55F366', borderRadius: 4,
            padding: '1px 5px', fontSize: 11, fontWeight: 700,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            background: theme.inputBg, color: theme.text, outline: 'none',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        />
      ) : (
        <span
          onDoubleClick={() => useGanttStore.getState().beginEditRow(row.id)}
          style={{
            flex: 1, minWidth: 0,
            fontSize: 10, fontWeight: 700,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            color: theme.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            cursor: 'text',
          }}
        >
          {row.name}
        </span>
      )}

      {/* Actions (only on hover) */}
      {hovered && !isEditing && (
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <SmallBtn onClick={onAddLane} title="Add lane to group" theme={theme}>+</SmallBtn>
          <SmallBtn
            onClick={() => {
              if (confirm(`Delete group "${row.name}" and all its lanes?`)) deleteRow(row.id)
            }}
            title="Delete group" danger theme={theme}
          >×</SmallBtn>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LaneRow
// ---------------------------------------------------------------------------
function LaneRow({ row, rowHeight, isEditing }: { row: Row; rowHeight: number; isEditing: boolean }) {
  const { updateRow, deleteRow, moveRowUp, moveRowDown, endEditRow, newRowId, addLane, beginEditRow } = useGanttStore()
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = React.useState(row.name)
  const [hovered, setHovered] = React.useState(false)

  const isSystem = isSystemRow(row)
  const indent = !isSystem && row.type === 'lane' ? 16 : 0

  useEffect(() => { setName(row.name) }, [row.name])

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isEditing])

  function commit() {
    const trimmed = name.trim()
    if (trimmed) updateRow(row.id, { name: trimmed })
    else setName(row.name)
    endEditRow()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = name.trim()
      if (trimmed) updateRow(row.id, { name: trimmed })
      else setName(row.name)
      // Rapid-entry: create next lane in same group
      if (newRowId === row.id) {
        const nextId = addLane({ groupId: row.parentGroupId })
        beginEditRow(nextId)
      } else {
        endEditRow()
      }
    }
    if (e.key === 'Escape') {
      if (!name.trim() && newRowId === row.id) { deleteRow(row.id); endEditRow(); return }
      setName(row.name); endEditRow()
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      commit()
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: rowHeight,
        display: 'flex', alignItems: 'flex-start',
        padding: `11px ${isEditing ? 8 : 14}px 0 ${indent}px`,
        background: isSystem
          ? (theme.isDark ? 'rgba(85,243,102,0.04)' : 'rgba(85,243,102,0.04)')
          : theme.surface,
        borderRight: `1px solid ${theme.border}`,
        borderBottom: `1px solid ${theme.borderSubtle}`,
        borderTop: isSystem ? '2px solid rgba(85,243,102,0.2)' : undefined,
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box', position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: 3, height: rowHeight,
        position: 'absolute', left: 0, top: 0,
        background: isSystem ? 'rgba(85,243,102,0.35)' : hovered ? '#55F366' : 'transparent',
        transition: 'background 0.15s', borderRadius: '0 2px 2px 0',
      }} />

      <div style={{ flex: 1, minWidth: 0, paddingLeft: isSystem ? 14 : 8 }}>
        {isEditing && !isSystem ? (
          <div>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              placeholder="Lane name…"
              style={{
                width: '100%', border: '1px solid #55F366', borderRadius: 5,
                padding: '2px 7px', fontSize: 12, fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                outline: 'none', background: theme.inputBg,
                boxSizing: 'border-box', color: theme.text,
              }}
            />
            {newRowId === row.id && (
              <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 3, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                Enter to add another · Esc to cancel
              </div>
            )}
          </div>
        ) : (
          <span
            onDoubleClick={() => { if (!isSystem) { useGanttStore.getState().beginEditRow(row.id) } }}
            title={isSystem ? 'Staging lane' : 'Double-click to rename'}
            style={{
              fontSize: 13, fontWeight: isSystem ? 500 : 600,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              fontStyle: isSystem ? 'italic' : 'normal',
              color: isSystem ? theme.textMuted : theme.text,
              cursor: isSystem ? 'default' : 'text',
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {row.name || <span style={{ color: theme.textMuted, fontStyle: 'italic' }}>Unnamed lane</span>}
          </span>
        )}
      </div>

      {/* Hover actions */}
      {hovered && !isEditing && !isSystem && (
        <div style={{ display: 'flex', gap: 1, paddingLeft: 4, flexShrink: 0, paddingTop: 2 }}>
          <SmallBtn onClick={() => moveRowUp(row.id)} title="Move up" theme={theme}>↑</SmallBtn>
          <SmallBtn onClick={() => moveRowDown(row.id)} title="Move down" theme={theme}>↓</SmallBtn>
          <SmallBtn
            onClick={() => {
              if (confirm(`Delete lane "${row.name}"? All tasks in this lane will be removed.`)) deleteRow(row.id)
            }}
            title="Delete lane" danger theme={theme}
          >×</SmallBtn>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared small button
// ---------------------------------------------------------------------------
function SmallBtn({ onClick, title, children, danger = false, theme }: {
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
        padding: 0, lineHeight: 1, fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme.borderSubtle }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
