'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Task } from '@/types'
import { ROW_HEIGHT, GROUP_HEADER_HEIGHT, LEFT_PANEL_WIDTH } from '@/lib/timeline'
import { getSubLaneCount } from '@/lib/taskLayout'
import { sortedVisibleRows, isGroupRow, isSystemRow } from '@/lib/rowUtils'
import { useGanttStore } from '@/store/ganttStore'
import { useTheme } from '@/lib/theme'

interface RowPanelProps { rows: Row[]; tasks: Task[] }

type DragState = {
  id: string
  label: string
  type: 'group' | 'lane'
  ghostX: number
  ghostY: number
  overRowId: string | null
  overPosition: 'before' | 'after' | 'into'
}

function getRowH(row: Row, tasks: Task[]): number {
  if (isGroupRow(row)) return GROUP_HEADER_HEIGHT
  const rt = tasks.filter(t => t.rowId === row.id)
  return Math.max(1, getSubLaneCount(rt)) * ROW_HEIGHT
}

export function RowPanel({ rows, tasks }: RowPanelProps) {
  const { editingRowId, reorderRows } = useGanttStore()
  const visible = sortedVisibleRows(rows)
  const containerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // Keep ref in sync for use inside event listeners
  useEffect(() => { dragRef.current = drag }, [drag])

  // Compute cumulative Y layout for hit-testing
  const rowLayout = useMemo(() => {
    const result: Array<{ id: string; top: number; height: number; type: string }> = []
    let y = 0
    for (const row of visible) {
      const h = getRowH(row, tasks)
      result.push({
        id: row.id,
        top: y,
        height: h,
        type: row.type ?? (row.isSystem ? 'system' : 'lane'),
      })
      y += h
    }
    return result
  }, [visible, tasks])

  const findDropTarget = useCallback(
    (relY: number, dragId: string, dragType: 'group' | 'lane') => {
      for (const { id, top, height, type } of rowLayout) {
        if (relY >= top + height) continue
        if (id === dragId) return { overRowId: null, overPosition: 'before' as const }
        if (type === 'system') return { overRowId: null, overPosition: 'before' as const }
        // Groups can only reorder among groups
        if (dragType === 'group' && type !== 'group') return { overRowId: null, overPosition: 'before' as const }
        // Lane over group header = append into that group
        if (dragType === 'lane' && type === 'group') return { overRowId: id, overPosition: 'into' as const }
        const pos: 'before' | 'after' = relY < top + height / 2 ? 'before' : 'after'
        return { overRowId: id, overPosition: pos }
      }
      return { overRowId: null, overPosition: 'after' as const }
    },
    [rowLayout],
  )

  // Attach global pointer handlers during drag
  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const relY = e.clientY - rect.top
      const { overRowId, overPosition } = findDropTarget(relY, d.id, d.type)
      setDrag((prev: DragState | null) => prev ? { ...prev, ghostX: e.clientX, ghostY: e.clientY, overRowId, overPosition } : null)
    }

    function onUp() {
      const d = dragRef.current
      if (d?.overRowId) reorderRows(d.id, d.overRowId, d.overPosition)
      setDrag(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [!!drag, findDropTarget, reorderRows]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drop indicator Y position (null = don't show line, show group highlight instead)
  const dropIndicatorY = useMemo(() => {
    if (!drag?.overRowId || drag.overPosition === 'into') return null
    const item = rowLayout.find((r: { id: string; top: number; height: number; type: string }) => r.id === drag.overRowId)
    if (!item) return null
    return drag.overPosition === 'before' ? item.top : item.top + item.height
  }, [drag, rowLayout])

  function startDrag(e: React.PointerEvent, row: Row) {
    if (isSystemRow(row)) return
    e.preventDefault()
    const type = isGroupRow(row) ? 'group' : 'lane'
    setDrag({ id: row.id, label: row.name, type, ghostX: e.clientX, ghostY: e.clientY, overRowId: null, overPosition: 'before' })
  }

  return (
    <div ref={containerRef} style={{ width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH, position: 'relative' }}>
      {visible.map((row) => {
        const isDragging = drag?.id === row.id
        const isDropTarget = drag?.overRowId === row.id && drag.overPosition === 'into'

        if (isGroupRow(row)) {
          return (
            <GroupHeader
              key={row.id}
              row={row}
              rows={rows}
              isEditing={editingRowId === row.id}
              isDragging={isDragging}
              isDropTarget={isDropTarget}
              dragActive={!!drag}
              onDragStart={(e) => startDrag(e, row)}
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
            isDragging={isDragging}
            dragActive={!!drag}
            onDragStart={(e) => startDrag(e, row)}
          />
        )
      })}

      {/* Drop indicator line */}
      {drag && dropIndicatorY !== null && (
        <div
          style={{
            position: 'absolute',
            left: 4, right: 4,
            top: dropIndicatorY - 1,
            height: 2,
            background: '#55F366',
            pointerEvents: 'none',
            zIndex: 50,
            borderRadius: 1,
          }}
        />
      )}

      {/* Drag ghost — fixed overlay following cursor */}
      {drag && (
        <div
          style={{
            position: 'fixed',
            left: drag.ghostX + 14,
            top: drag.ghostY - 13,
            pointerEvents: 'none',
            zIndex: 9999,
            background: '#55F366',
            color: '#000404',
            borderRadius: 6,
            padding: '3px 10px 4px',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {drag.label || 'Unnamed'}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GroupHeader
// ---------------------------------------------------------------------------
function GroupHeader({
  row, rows, isEditing, isDragging, isDropTarget, dragActive, onDragStart,
}: {
  row: Row; rows: Row[]; isEditing: boolean
  isDragging: boolean; isDropTarget: boolean; dragActive: boolean
  onDragStart: (e: React.PointerEvent) => void
}) {
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
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      if (!name.trim() && newRowId === row.id) { deleteRow(row.id); endEditRow(); return }
      setName(row.name); endEditRow()
    }
  }

  const groups = rows.filter(r => r.type === 'group').sort((a, b) => a.order - b.order)
  const idx = groups.findIndex(g => g.id === row.id)
  const canMoveUp = idx > 0
  const canMoveDown = idx < groups.length - 1

  const showHover = hovered && !dragActive

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: GROUP_HEADER_HEIGHT,
        display: 'flex', alignItems: 'center',
        padding: '0 6px 0 4px',
        background: isDropTarget
          ? (theme.isDark ? 'rgba(85,243,102,0.18)' : 'rgba(85,243,102,0.15)')
          : (theme.isDark ? 'rgba(85,243,102,0.07)' : 'rgba(0,74,60,0.055)'),
        borderRight: `2px solid ${theme.isDark ? 'rgba(255,255,255,0.16)' : theme.border}`,
        borderBottom: `1px solid ${theme.border}`,
        outline: isDropTarget ? '2px solid rgba(85,243,102,0.6)' : 'none',
        outlineOffset: -2,
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box', gap: 3,
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 0.1s, background 0.1s',
        cursor: isDragging ? 'grabbing' : undefined,
      }}
    >
      {/* Drag handle */}
      <DragHandle onPointerDown={onDragStart} visible={showHover && !isEditing} />

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
      {showHover && !isEditing && (
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <SmallBtn onClick={() => moveRowUp(row.id)} title="Move group up" disabled={!canMoveUp} theme={theme}>↑</SmallBtn>
          <SmallBtn onClick={() => moveRowDown(row.id)} title="Move group down" disabled={!canMoveDown} theme={theme}>↓</SmallBtn>
          <SmallBtn onClick={() => { const id = addLane({ groupId: row.id }); beginEditRow(id) }} title="Add lane to group" theme={theme}>+</SmallBtn>
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
function LaneRow({
  row, rows, rowHeight, isEditing, isDragging, dragActive, onDragStart,
}: {
  row: Row; rows: Row[]; rowHeight: number; isEditing: boolean
  isDragging: boolean; dragActive: boolean
  onDragStart: (e: React.PointerEvent) => void
}) {
  const { updateRow, deleteRow, moveRowUp, moveRowDown, moveLaneToGroup, endEditRow, newRowId, addLane, beginEditRow } = useGanttStore()
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(row.name)
  const [hovered, setHovered] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const isSystem = isSystemRow(row)
  const indent = !isSystem && row.type === 'lane' ? 16 : 0

  const parentGroup = !isSystem && row.parentGroupId ? rows.find(r => r.id === row.parentGroupId) : null
  const groupLabel = parentGroup && parentGroup.name !== 'Ungrouped' ? parentGroup.name : null

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

  const showHover = hovered && !dragActive

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
        borderTop: isSystem ? `1px solid ${theme.isDark ? 'rgba(85,243,102,0.22)' : 'rgba(0,74,60,0.2)'}` : undefined,
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        boxSizing: 'border-box', position: 'relative',
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 0.1s',
        cursor: isDragging ? 'grabbing' : undefined,
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: 3, height: '100%',
        position: 'absolute', left: 0, top: 0,
        background: isSystem ? 'rgba(85,243,102,0.3)' : hovered ? '#55F366' : 'transparent',
        transition: 'background 0.15s', borderRadius: '0 2px 2px 0',
      }} />

      {/* Drag handle */}
      {!isSystem && (
        <DragHandle onPointerDown={onDragStart} visible={showHover && !isEditing} />
      )}

      <div style={{ flex: 1, minWidth: 0, paddingLeft: isSystem ? 14 : 6 }}>
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
            {showHover && !isSystem && groupLabel && (
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
      {showHover && !isEditing && !isSystem && (
        <div style={{ display: 'flex', gap: 1, flexShrink: 0, paddingTop: 1, position: 'relative' }}>
          <SmallBtn onClick={() => moveRowUp(row.id)} title="Move up" theme={theme}>↑</SmallBtn>
          <SmallBtn onClick={() => moveRowDown(row.id)} title="Move down" theme={theme}>↓</SmallBtn>
          {otherGroups.length > 0 && (
            <div style={{ position: 'relative' }}>
              <SmallBtn onClick={() => setShowMoveMenu(v => !v)} title="Move to group" theme={theme}>⋯</SmallBtn>
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
// Drag handle — 6-dot grip icon
// ---------------------------------------------------------------------------
function DragHandle({ onPointerDown, visible }: {
  onPointerDown: (e: React.PointerEvent) => void
  visible: boolean
}) {
  const theme = useTheme()
  return (
    <div
      onPointerDown={onPointerDown}
      title="Drag to reorder"
      style={{
        width: 14, height: 20, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'grab',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.12s',
        color: theme.textMuted,
        touchAction: 'none',
        userSelect: 'none',
        marginLeft: 2,
      }}
    >
      <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
        <circle cx="2" cy="2" r="1.2" />
        <circle cx="6" cy="2" r="1.2" />
        <circle cx="2" cy="7" r="1.2" />
        <circle cx="6" cy="7" r="1.2" />
        <circle cx="2" cy="12" r="1.2" />
        <circle cx="6" cy="12" r="1.2" />
      </svg>
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
