'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { useGanttStore } from '@/store/ganttStore'
import { getDefaultViewState, formatDate, parseDate } from '@/lib/timeline'

interface AddDividerForm {
  date: string
  label: string
  color: string
  style: 'solid' | 'dashed'
}

// Tiimely brand tokens
const T = {
  black: '#000404',
  green: '#55F366',
  teal: '#1FE7DC',
  eggshell: '#FBF9F3',
  midGray: '#B0AEA5',
  white: '#FFFFFF',
  divider: 'rgba(255,255,255,0.12)',
  hover: 'rgba(255,255,255,0.07)',
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
    color: '#55F366',
    style: 'solid',
  })
  const [customStart, setCustomStart] = useState(viewState.startDate)
  const [customEnd, setCustomEnd] = useState(viewState.endDate)

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  function jumpToToday() {
    window.dispatchEvent(new CustomEvent('gantt:jump-today'))
  }

  function handleZoom(zoom: '1q' | '2q') {
    setViewState(getDefaultViewState(zoom))
  }

  function handleCustomRange() {
    if (customStart >= customEnd) return
    setViewState({
      startDate: customStart,
      endDate: customEnd,
      zoom: 'custom',
      dayWidth: Math.max(4, Math.min(30,
        1800 / Math.max(1, (parseDate(customEnd).getTime() - parseDate(customStart).getTime()) / 86400000)
      )),
    })
    setShowCustomRange(false)
  }

  function handleAddDivider() {
    if (!dividerForm.date) return
    addDivider(dividerForm)
    setShowDividerModal(false)
    setDividerForm({ date: formatDate(new Date()), label: '', color: '#55F366', style: 'solid' })
  }

  return (
    <header style={{
      height: 54,
      background: T.black,
      display: 'flex',
      alignItems: 'stretch',
      padding: '0 20px',
      gap: 10,
      flexShrink: 0,
      zIndex: 50,
      position: 'relative',
    }}>
      {/* Green gradient accent bar at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(90deg, #55F366 0%, #1FE7DC 100%)',
      }} />

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 12 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="1" y="5" width="11" height="5" rx="2.5" fill="#55F366" />
          <rect x="7" y="12" width="12" height="5" rx="2.5" fill="#1FE7DC" />
        </svg>
        <span style={{
          fontFamily: "'Darker Grotesque', Georgia, serif",
          fontWeight: 900,
          fontSize: 17,
          color: T.white,
          letterSpacing: '-0.02em',
        }}>
          mrgant
        </span>
      </div>

      <ToolbarDivider />

      {/* Zoom toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {(['1q', '2q'] as const).map((z) => {
          const active = viewState.zoom === z
          return (
            <button
              key={z}
              onClick={() => handleZoom(z)}
              style={{
                padding: '5px 13px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: "'Poppins', Arial, sans-serif",
                fontWeight: 600,
                background: active ? T.green : 'transparent',
                color: active ? T.black : T.midGray,
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = T.hover }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {z === '1q' ? '1 Quarter' : '2 Quarters'}
            </button>
          )
        })}

        {/* Custom range */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCustomRange((v) => !v)}
            style={{
              padding: '5px 13px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: "'Poppins', Arial, sans-serif",
              fontWeight: 600,
              background: viewState.zoom === 'custom' ? T.green : 'transparent',
              color: viewState.zoom === 'custom' ? T.black : T.midGray,
            }}
          >
            Custom
          </button>
          {showCustomRange && (
            <Dropdown onClose={() => setShowCustomRange(false)}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.black, marginBottom: 14, fontFamily: "'Poppins', Arial" }}>
                Custom range
              </div>
              <DropdownField label="Start date">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={dropdownInput} />
              </DropdownField>
              <DropdownField label="End date">
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={dropdownInput} />
              </DropdownField>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={handleCustomRange} style={primaryBtnStyle}>Apply</button>
                <button onClick={() => setShowCustomRange(false)} style={ghostBtnStyle}>Cancel</button>
              </div>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Date range */}
      <span style={{ fontSize: 11, color: T.midGray, fontFamily: "'Poppins', Arial", fontWeight: 500, display: 'flex', alignItems: 'center' }}>
        {format(parseDate(viewState.startDate), 'MMM d')} – {format(parseDate(viewState.endDate), 'MMM d, yyyy')}
      </span>

      <div style={{ flex: 1 }} />

      {/* Today */}
      <ToolbarBtn onClick={jumpToToday} title="Jump to today">
        <TodayIcon /> <span>Today</span>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Add lane */}
      <ToolbarBtn onClick={() => addRow()} title="Add lane">
        <PlusIcon /> <span>Add lane</span>
      </ToolbarBtn>

      {/* Add divider marker */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <ToolbarBtn onClick={() => setShowDividerModal((v) => !v)} title="Add marker">
          <MarkerIcon /> <span>Marker</span>
        </ToolbarBtn>
        {showDividerModal && (
          <Dropdown onClose={() => setShowDividerModal(false)} right>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.black, marginBottom: 14, fontFamily: "'Poppins', Arial" }}>
              Add divider marker
            </div>
            <DropdownField label="Date">
              <input type="date" value={dividerForm.date}
                onChange={(e) => setDividerForm((f) => ({ ...f, date: e.target.value }))}
                style={dropdownInput} />
            </DropdownField>
            <DropdownField label="Label">
              <input type="text" value={dividerForm.label} placeholder="e.g. Design freeze"
                onChange={(e) => setDividerForm((f) => ({ ...f, label: e.target.value }))}
                style={dropdownInput} />
            </DropdownField>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <DropdownField label="Color" style={{ flex: 1 }}>
                <input type="color" value={dividerForm.color}
                  onChange={(e) => setDividerForm((f) => ({ ...f, color: e.target.value }))}
                  style={{ ...dropdownInput, padding: 2, height: 34 }} />
              </DropdownField>
              <DropdownField label="Style" style={{ flex: 1 }}>
                <select value={dividerForm.style}
                  onChange={(e) => setDividerForm((f) => ({ ...f, style: e.target.value as 'solid' | 'dashed' }))}
                  style={dropdownInput}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                </select>
              </DropdownField>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddDivider} style={primaryBtnStyle}>Add</button>
              <button onClick={() => setShowDividerModal(false)} style={ghostBtnStyle}>Cancel</button>
            </div>
          </Dropdown>
        )}
      </div>

      <ToolbarDivider />

      {/* Undo / Redo */}
      <ToolbarBtn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <UndoIcon />
      </ToolbarBtn>
      <ToolbarBtn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        <RedoIcon />
      </ToolbarBtn>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ToolbarDivider() {
  return <div style={{ width: 1, background: T.divider, alignSelf: 'stretch', margin: '10px 4px', flexShrink: 0 }} />
}

function ToolbarBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px',
        border: 'none', borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: "'Poppins', Arial, sans-serif",
        fontWeight: 500,
        color: disabled ? 'rgba(255,255,255,0.2)' : T.white,
        background: 'transparent',
        alignSelf: 'center',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = T.hover }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

function Dropdown({ children, onClose, right }: { children: React.ReactNode; onClose: () => void; right?: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      top: 48, [right ? 'right' : 'left']: 0,
      background: '#fff',
      border: '1px solid #E8E6DE',
      borderRadius: 10,
      padding: 18,
      boxShadow: '0 8px 32px rgba(0,4,4,0.12)',
      zIndex: 100,
      minWidth: 250,
      fontFamily: "'Poppins', Arial, sans-serif",
    }}>
      {children}
    </div>
  )
}

function DropdownField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#B0AEA5', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// Styles
const dropdownInput: React.CSSProperties = {
  width: '100%', padding: '7px 9px',
  border: '1px solid #E8E6DE', borderRadius: 6,
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Poppins', Arial, sans-serif",
  color: '#000404', background: '#fff',
}

const primaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: '8px 0',
  background: '#55F366', color: '#000404',
  border: 'none', borderRadius: 7,
  fontSize: 13, fontWeight: 700,
  fontFamily: "'Poppins', Arial, sans-serif",
  cursor: 'pointer',
}

const ghostBtnStyle: React.CSSProperties = {
  flex: 1, padding: '8px 0',
  background: 'transparent', color: '#000404',
  border: '1px solid #E8E6DE', borderRadius: 7,
  fontSize: 13, fontWeight: 500,
  fontFamily: "'Poppins', Arial, sans-serif",
  cursor: 'pointer',
}

// Icons
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12" /><line x1="1" y1="6.5" x2="12" y2="6.5" /></svg>
}
function TodayIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="2" width="11" height="10" rx="2" /><line x1="4" y1="1" x2="4" y2="3.5" /><line x1="9" y1="1" x2="9" y2="3.5" /><line x1="6.5" y1="6.5" x2="6.5" y2="9" /></svg>
}
function MarkerIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 1.5"><line x1="6.5" y1="1" x2="6.5" y2="12" /></svg>
}
function UndoIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5a4.5 4.5 0 1 0 1-2.7" /><polyline points="2,2 2,6.5 6.5,6.5" /></svg>
}
function RedoIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 6.5a4.5 4.5 0 1 1-1-2.7" /><polyline points="11,2 11,6.5 6.5,6.5" /></svg>
}
