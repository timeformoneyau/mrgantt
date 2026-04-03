'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { useGanttStore } from '@/store/ganttStore'
import { getDefaultViewState, formatDate, parseDate } from '@/lib/timeline'

interface AddDividerForm {
  date: string
  label: string
  color: string
  style: 'solid' | 'dashed'
}

export function Toolbar() {
  const {
    viewState, setViewState, addRow, addDivider,
    undo, redo, past, future,
  } = useGanttStore()

  const [showDividerModal, setShowDividerModal] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [dividerForm, setDividerForm] = useState<AddDividerForm>({
    date: formatDate(new Date()),
    label: '',
    color: '#8b5cf6',
    style: 'solid',
  })
  const [customStart, setCustomStart] = useState(viewState.startDate)
  const [customEnd, setCustomEnd] = useState(viewState.endDate)

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  function jumpToToday() {
    // This just signals the chart to scroll to today via a custom event
    window.dispatchEvent(new CustomEvent('gantt:jump-today'))
  }

  function handleZoom(zoom: '1q' | '2q') {
    const vs = getDefaultViewState(zoom)
    setViewState(vs)
  }

  function handleCustomRange() {
    if (customStart >= customEnd) return
    setViewState({
      startDate: customStart,
      endDate: customEnd,
      zoom: 'custom',
      dayWidth: Math.max(4, Math.min(30, 1800 / Math.max(1, (parseDate(customEnd).getTime() - parseDate(customStart).getTime()) / 86400000))),
    })
    setShowCustomRange(false)
  }

  function handleAddDivider() {
    if (!dividerForm.date) return
    addDivider(dividerForm)
    setShowDividerModal(false)
    setDividerForm({ date: formatDate(new Date()), label: '', color: '#8b5cf6', style: 'solid' })
  }

  return (
    <header
      style={{
        height: 52,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="1" y="6" width="13" height="4" rx="2" fill="#6366f1" />
          <rect x="7" y="13" width="14" height="4" rx="2" fill="#10b981" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: '#111827' }}>
          mrgant
        </span>
      </div>

      <Divider />

      {/* Zoom */}
      <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
        {(['1q', '2q'] as const).map((z) => (
          <button
            key={z}
            onClick={() => handleZoom(z)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: viewState.zoom === z ? '#ffffff' : 'transparent',
              color: viewState.zoom === z ? '#111827' : '#6b7280',
              boxShadow: viewState.zoom === z ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.1s',
            }}
          >
            {z === '1q' ? '1 Quarter' : '2 Quarters'}
          </button>
        ))}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCustomRange((v) => !v)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: viewState.zoom === 'custom' ? '#ffffff' : 'transparent',
              color: viewState.zoom === 'custom' ? '#111827' : '#6b7280',
              boxShadow: viewState.zoom === 'custom' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Custom
          </button>
          {showCustomRange && (
            <div
              style={{
                position: 'absolute',
                top: 36,
                left: 0,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 16,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 100,
                minWidth: 260,
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Start date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>End date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCustomRange} style={primaryBtn}>Apply</button>
                <button onClick={() => setShowCustomRange(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date range display */}
      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
        {format(parseDate(viewState.startDate), 'MMM d')} – {format(parseDate(viewState.endDate), 'MMM d, yyyy')}
      </span>

      <div style={{ flex: 1 }} />

      {/* Today */}
      <ToolbarButton onClick={jumpToToday} title="Jump to today">
        <TodayIcon />
        <span>Today</span>
      </ToolbarButton>

      <Divider />

      {/* Add row */}
      <ToolbarButton onClick={() => addRow()} title="Add lane">
        <PlusIcon />
        <span>Add Lane</span>
      </ToolbarButton>

      {/* Add divider */}
      <div style={{ position: 'relative' }}>
        <ToolbarButton onClick={() => setShowDividerModal((v) => !v)} title="Add divider marker">
          <DividerIcon />
          <span>Marker</span>
        </ToolbarButton>
        {showDividerModal && (
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: 0,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 100,
              minWidth: 240,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 12 }}>
              Add Divider Marker
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={dividerForm.date}
                onChange={(e) => setDividerForm((f) => ({ ...f, date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Label</label>
              <input
                type="text"
                value={dividerForm.label}
                onChange={(e) => setDividerForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Design Freeze"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Color</label>
                <input
                  type="color"
                  value={dividerForm.color}
                  onChange={(e) => setDividerForm((f) => ({ ...f, color: e.target.value }))}
                  style={{ ...inputStyle, padding: 2, height: 34 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Style</label>
                <select
                  value={dividerForm.style}
                  onChange={(e) => setDividerForm((f) => ({ ...f, style: e.target.value as 'solid' | 'dashed' }))}
                  style={inputStyle}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddDivider} style={primaryBtn}>Add</button>
              <button onClick={() => setShowDividerModal(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Undo / Redo */}
      <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        <RedoIcon />
      </ToolbarButton>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function Divider() {
  return <div style={{ width: 1, height: 20, background: '#e5e7eb', flexShrink: 0 }} />
}

function ToolbarButton({
  onClick, disabled, title, children,
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        border: 'none',
        borderRadius: 7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 500,
        color: disabled ? '#d1d5db' : '#374151',
        background: 'transparent',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.background = '#f3f4f6'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

// Styles
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '7px 0',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: '7px 0',
  background: 'transparent',
  color: '#6b7280',
  border: '1px solid #e5e7eb',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

// Icons
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="7" y1="1" x2="7" y2="13" />
      <line x1="1" y1="7" x2="13" y2="7" />
    </svg>
  )
}

function TodayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="2" width="12" height="11" rx="2" />
      <line x1="4" y1="1" x2="4" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="7" y1="7" x2="7" y2="10" />
    </svg>
  )
}

function DividerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 1.5">
      <line x1="7" y1="1" x2="7" y2="13" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7a5 5 0 1 0 1-3" />
      <polyline points="2,2 2,7 7,7" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7a5 5 0 1 1-1-3" />
      <polyline points="12,2 12,7 7,7" />
    </svg>
  )
}
