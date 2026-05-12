'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Row, Task } from '@/types'
import { ROW_HEIGHT, GROUP_HEADER_HEIGHT, LEFT_PANEL_WIDTH } from '@/lib/timeline'
import { getSubLaneCount } from '@/lib/taskLayout'
import { sortedVisibleRows, isGroupRow, isSystemRow } from '@/lib/rowUtils'
import { useGanttStore } from '@/store/ganttStore'
import { useTheme } from '@/lib/theme'

interface RowPanelProps { rows: Row[]; tasks: Task[] }

export function RowPanel({ rows, tasks }: RowPanelProps) {
  const { editingRowId } = useGanttStore()
  const visible = sortedVisibleRows(rows)

  return (
    <div style={{ width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH }}>
      {visible.map((row) => {
        if (isGroupRow(row)) {
          return (
            <GroupHeader
              key={row.id}
              row={row}
              rows={rows}
              isEditing={editingRowId === row.id}
            />
          )
        }
        const rowTasks = tasks.filter(t => t.rowId === row.id)
        const numLanes = Math.max(1, getSubLaneCount(rowTasks))
        return (
          <LaneRow
            key={row.id}
            row={row}
            rows={rows}
            rowHeight={numLanes * ROW_HEIGHT}
            isEditing={editingRowId === row.id}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GroupHeader
// ---------------------------------------------------------------------------
function GroupHeader({ row, rows, isEditing }: { row: Row; rows: Row[]; isEditing: boolean }) {
  const { updateRow, deleteRow, toggleGroup, moveRowUp, moveRowDown, addLane, beginEditRow, endEditRow, newRowId } = useGanttStore()
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(row.name)
  const [hovered, setHovered] = useState(false)

  useEffect(() => { setName(row.name) }, [row.name])

  useEffect(() => {
    if (isEditing) requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select() })
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

  const groups = rows.filter(r => r.type === 'group').sort((a, b) => a.order - b.order)
  const idx = groups.findIndex(g => g.id === row.id)
  const canMoveUp = idx > 0
  const canMoveDown = idx < groups.length - 1

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: GROUP_HEADER_HEIGHT,
        display: 'flex', alignItems: 'center',
        padding: '0 6px 0 4px',
        background: theme.isDark ? 'rgba(85,243,102,0.07)' : 'rgba(0,74,60,0.055)',
        borderRight: `2px solid ${theme.isDark ? 'rgba(255,255,255,0.16)' : theme.border}`,
        borderBottom: `1px solid ${theme.border}`,
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box', gap: 3,
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
          borderRadius: 3,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme.borderSubtle; (e.currentTarget as HTMLElement).style.color = theme.text }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = theme.textMuted }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,3.5 5,6.5 8,3.5" />
        </svg>
      </button>

      {/* Name */}
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

      {/* Actions on hover */}
      {hovered && !isEditing && (
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <SmallBtn onClick={() => moveRowUp(row.id)} title="Move group up" disabled={!canMoveUp} theme={theme}>↑</SmallBtn>
          <SmallBtn onClick={() => moveRowDown(row.id)} title="Move group down" disabled={!canMoveDown} theme={theme}>↓</SmallBtn>
          <SmallBtn
            onClick={() => { const id = addLane({ groupId: row.id }); beginEditRow(id) }}
            title="Add lane to group" theme={theme}
          >+</SmallBtn>
          <SmallBtn
            onClick={() => { if (confirm(`Delete group "${row.name}" and all its lanes?`)) deleteRow(row.id) }}
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
function LaneRow({ row, rows, rowHeight, isEditing }: { row: Row; rows: Row[]; rowHeight: number; isEditing: boolean }) {
  const { updateRow, deleteRow, moveRowUp, moveRowDown, moveLaneToGroup, endEditRow, newRowId, addLane, beginEditRow } = useGanttStore()
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(row.name)
  const [hovered, setHovered] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const isSystem = isSystemRow(row)
  const indent = !isSystem && row.type === 'lane' ? 16 : 0

  // Membership info for non-system lanes
  const parentGroup = !isSystem && row.parentGroupId
    ? rows.find(r => r.id === row.parentGroupId)
    : null
  const groupLabel = parentGroup && parentGroup.name !== 'Ungrouped' ? parentGroup.name : null

  // Groups available for "Move to group" menu
  const otherGroups = rows
    .filter(r => r.type === 'group' && r.id !== row.parentGroupId)
    .sort((a, b) => a.order - b.order)

  useEffect(() => { setName(row.name) }, [row.name])

  useEffect(() => {
    if (isEditing) requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select() })
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
    if (e.key === 'Tab') { e.preventDefault(); commit() }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMoveMenu(false) }}
      style={{
        height: rowHeight,
        display: 'flex', alignItems: 'flex-start',
        paddingTop: isSystem ? 6 : 10,
        paddingRight: 6,
        paddingLeft: indent,
        background: isSystem
          ? (theme.isDark ? 'rgba(85,243,102,0.04)' : 'rgba(85,243,102,0.03)')
          : theme.surface,
        borderRight: `2px solid ${theme.isDark ? 'rgba(255,255,255,0.16)' : theme.border}`,
        borderBottom: `1px solid ${theme.borderSubtle}`,
        // Staging gets a stronger visual divider
        borderTop: isSystem ? `1px solid ${theme.isDark ? 'rgba(85,243,102,0.22)' : 'rgba(0,74,60,0.2)'}` : undefined,
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box', position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: 3, height: '100%',
        position: 'absolute', left: 0, top: 0,
        background: isSystem ? 'rgba(85,243,102,0.3)' : hovered ? '#55F366' : 'transparent',
        transition: 'background 0.15s', borderRadius: '0 2px 2px 0',
      }} />

      <div style={{ flex: 1, minWidth: 0, paddingLeft: isSystem ? 14 : 6 }}>
        {/* STAGING AREA label — sits inside the system row's top padding */}
        {isSystem && (
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: theme.isDark ? 'rgba(85,243,102,0.5)' : 'rgba(0,74,60,0.4)',
            textTransform: 'uppercase',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            marginBottom: 3,
          }}>
            Staging Area
          </div>
        )}

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
          <div>
            <span
              onDoubleClick={() => { if (!isSystem) useGanttStore.getState().beginEditRow(row.id) }}
              title={isSystem ? 'Staging — drag tasks here to unassign' : 'Double-click to rename'}
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
            {/* Group membership badge — shown on hover for grouped lanes */}
            {hovered && !isSystem && groupLabel && (
              <div style={{
                fontSize: 9, color: theme.textMuted, marginTop: 1,
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}>
                in {groupLabel}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovered && !isEditing && !isSystem && (
        <div style={{ display: 'flex', gap: 1, flexShrink: 0, paddingTop: 1, position: 'relative' }}>
          <SmallBtn onClick={() => moveRowUp(row.id)} title="Move up" theme={theme}>↑</SmallBtn>
          <SmallBtn onClick={() => moveRowDown(row.id)} title="Move down" theme={theme}>↓</SmallBtn>
          {/* Move to group */}
          {otherGroups.length > 0 && (
            <div style={{ position: 'relative' }}>
              <SmallBtn
                onClick={() => setShowMoveMenu(v => !v)}
                title="Move to group"
                theme={theme}
              >
                ⋯
              </SmallBtn>
              {showMoveMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 22, zIndex: 50,
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                  minWidth: 140, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '5px 10px 4px',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    color: theme.textMuted, textTransform: 'uppercase',
                    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}>
                    Move to group
                  </div>
                  {otherGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { moveLaneToGroup(row.id, g.id); setShowMoveMenu(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '7px 10px', background: 'none', border: 'none',
                        fontSize: 12, color: theme.text, cursor: 'pointer',
                        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                        borderBottom: `1px solid ${theme.borderSubtle}`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme.surfaceAlt }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <SmallBtn
            onClick={() => { if (confirm(`Delete lane "${row.name}"?`)) deleteRow(row.id) }}
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
function SmallBtn({ onClick, title, children, danger = false, disabled = false, theme }: {
  onClick: () => void; title: string; children: React.ReactNode
  danger?: boolean; disabled?: boolean; theme: ReturnType<typeof useTheme>
}) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      style={{
        width: 20, height: 20, border: 'none', borderRadius: 4,
        background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        fontSize: 12,
        color: disabled ? theme.borderSubtle : danger ? theme.text : theme.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, lineHeight: 1, fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = theme.borderSubtle }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
