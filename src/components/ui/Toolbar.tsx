'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { useGanttStore } from '@/store/ganttStore'
import { getDefaultViewState, formatDate, parseDate } from '@/lib/timeline'
import { useTheme, Theme } from '@/lib/theme'

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

export function Toolbar({ onHome }: { onHome?: () => void }) {
  const {
    viewState, setViewState, addRow, addDivider,
    undo, redo, past, future, darkMode, toggleDarkMode, clearAll,
    tasks, rows, dividers, projectId, syncStatus,
  } = useGanttStore()
  const theme = useTheme()

  // Theme-aware dropdown styles — computed here so they pick up the current theme
  const dropdownInput: React.CSSProperties = {
    width: '100%', padding: '7px 9px',
    border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: theme.text, background: theme.inputBg,
  }
  const primaryBtnStyle: React.CSSProperties = {
    flex: 1, padding: '8px 0',
    background: '#55F366', color: '#000404',
    border: 'none', borderRadius: 7,
    fontSize: 13, fontWeight: 700,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    cursor: 'pointer',
  }
  const ghostBtnStyle: React.CSSProperties = {
    flex: 1, padding: '8px 0',
    background: 'transparent', color: theme.text,
    border: `1px solid ${theme.border}`, borderRadius: 7,
    fontSize: 13, fontWeight: 500,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    cursor: 'pointer',
  }

  const [showDividerModal, setShowDividerModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [dividerForm, setDividerForm] = useState<AddDividerForm>({
    date: formatDate(new Date()),
    label: '',
    color: '#55F366',
    style: 'solid',
  })
  const [customStart, setCustomStart] = useState(viewState.startDate)
  const [customEnd, setCustomEnd] = useState(viewState.endDate)
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: viewState.startDate, end: viewState.endDate })

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  function jumpToToday() {
    window.dispatchEvent(new CustomEvent('gantt:jump-today'))
  }

  function handleZoom(zoom: '1q' | '2q') {
    setViewState(getDefaultViewState(zoom))
  }

  // Scale modes — set dayWidth so one "unit" = one week / sprint / month
  // Weekly: 7 days visible per ~28px column → dayWidth 28
  // Sprint: 14 days per column → dayWidth 14
  // Monthly: ~30 days per column → dayWidth 6
  const SCALE_MODES = [
    { id: 'weekly',  label: 'Weekly',  dayWidth: 28 },
    { id: 'sprint',  label: 'Sprint',  dayWidth: 14 },
    { id: 'monthly', label: 'Monthly', dayWidth: 6  },
  ] as const

  type ScaleMode = typeof SCALE_MODES[number]['id']

  function currentScaleMode(): ScaleMode {
    const dw = viewState.dayWidth
    if (dw >= 20) return 'weekly'
    if (dw >= 10) return 'sprint'
    return 'monthly'
  }

  function handleScale(mode: ScaleMode) {
    const m = SCALE_MODES.find(s => s.id === mode)!
    setViewState({ dayWidth: m.dayWidth })
  }

  function handleCustomRange() {
    if (customStart >= customEnd) return
    setCustomRange({ start: customStart, end: customEnd })
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

  function handleCustomButtonClick() {
    if (showCustomRange) {
      // dropdown is open — just close it
      setShowCustomRange(false)
    } else if (viewState.zoom === 'custom') {
      // already in custom mode — toggle dropdown open/closed
      setShowCustomRange(true)
    } else {
      // not in custom mode — immediately apply last known customRange
      setViewState({
        startDate: customRange.start,
        endDate: customRange.end,
        zoom: 'custom',
        dayWidth: Math.max(4, Math.min(30,
          1800 / Math.max(1, (parseDate(customRange.end).getTime() - parseDate(customRange.start).getTime()) / 86400000)
        )),
      })
    }
  }

  function handleAddDivider() {
    if (!dividerForm.date) return
    addDivider(dividerForm)
    setShowDividerModal(false)
    setDividerForm({ date: formatDate(new Date()), label: '', color: '#55F366', style: 'solid' })
  }

  async function handleExport() {
    if (!projectId) return
    setExporting(true)
    try {
      // Fetch project name from server
      const meta = await fetch(`/api/gantt?id=${projectId}`).then(r => r.json())
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, rows, dividers, viewState, projectName: meta.name || 'Project' }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (meta.name || 'gantt').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_gantt.pptx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
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

      {/* Home button */}
      {onHome && (
        <button
          onClick={onHome}
          title="All Charts"
          style={{
            background: 'transparent',
            border: 'none',
            color: T.midGray,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            padding: '0 8px',
            borderRadius: 6,
            marginRight: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#55F366')}
          onMouseLeave={e => (e.currentTarget.style.color = T.midGray)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7L7 1L13 7V13H9V9H5V13H1V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          Charts
        </button>
      )}

      <ToolbarDivider />

      {/* Scale mode toggle — Weekly / Sprint / Monthly */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {SCALE_MODES.map((m) => {
          const active = currentScaleMode() === m.id
          return (
            <button
              key={m.id}
              onClick={() => handleScale(m.id)}
              style={{
                padding: '5px 13px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                fontWeight: 600,
                background: active ? T.green : 'transparent',
                color: active ? T.black : 'rgba(255,255,255,0.75)',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = T.hover }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {m.label}
            </button>
          )
        })}

        {/* Custom range */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleCustomButtonClick}
            style={{
              padding: '5px 13px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              fontWeight: 600,
              background: viewState.zoom === 'custom' ? T.green : 'transparent',
              color: viewState.zoom === 'custom' ? T.black : 'rgba(255,255,255,0.75)',
            }}
          >
            Custom
          </button>
          {showCustomRange && (
            <Dropdown onClose={() => setShowCustomRange(false)} theme={theme}>
              <div style={{ fontWeight: 700, fontSize: 13, color: theme.text, marginBottom: 14, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                Custom range
              </div>
              <DropdownField label="Start date" theme={theme}>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={dropdownInput} />
              </DropdownField>
              <DropdownField label="End date" theme={theme}>
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
      <span style={{ fontSize: 11, color: T.midGray, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 500, display: 'flex', alignItems: 'center' }}>
        {format(parseDate(viewState.startDate), 'MMM d')} – {format(parseDate(viewState.endDate), 'MMM d, yyyy')}
      </span>

      <div style={{ flex: 1 }} />

      {/* Sync status indicator */}
      {syncStatus !== 'idle' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          color: syncStatus === 'error' ? '#ff6b6b' : syncStatus === 'saving' ? T.midGray : '#55F366',
          opacity: 0.9,
          flexShrink: 0,
        }}>
          {syncStatus === 'saving' && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
            </svg>
          )}
          {syncStatus === 'saved' && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,5.5 4.5,8 9,3" />
            </svg>
          )}
          {syncStatus === 'error' && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="2" x2="9" y2="9" /><line x1="9" y1="2" x2="2" y2="9" />
            </svg>
          )}
          <span>
            {syncStatus === 'saving' ? 'Saving…' : syncStatus === 'saved' ? 'Saved' : 'Save failed'}
          </span>
        </div>
      )}

      {/* Today */}
      <ToolbarBtn onClick={jumpToToday} title="Jump to today">
        <TodayIcon /> <span>Today</span>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Add lane */}
      <ToolbarBtn onClick={() => addRow()} title="Add lane">
        <PlusIcon /> <span>Add Lane</span>
      </ToolbarBtn>

      {/* Add divider marker */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <ToolbarBtn onClick={() => setShowDividerModal((v) => !v)} title="Add marker">
          <MarkerIcon /> <span>Add Marker</span>
        </ToolbarBtn>
        {showDividerModal && (
          <Dropdown onClose={() => setShowDividerModal(false)} right theme={theme}>
            <div style={{ fontWeight: 700, fontSize: 13, color: theme.text, marginBottom: 14, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
              Add divider marker
            </div>
            <DropdownField label="Date" theme={theme}>
              <input type="date" value={dividerForm.date}
                onChange={(e) => setDividerForm((f) => ({ ...f, date: e.target.value }))}
                style={dropdownInput} />
            </DropdownField>
            <DropdownField label="Label" theme={theme}>
              <input type="text" value={dividerForm.label} placeholder="e.g. Design freeze"
                onChange={(e) => setDividerForm((f) => ({ ...f, label: e.target.value }))}
                style={dropdownInput} />
            </DropdownField>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <DropdownField label="Color" style={{ flex: 1 }} theme={theme}>
                <input type="color" value={dividerForm.color}
                  onChange={(e) => setDividerForm((f) => ({ ...f, color: e.target.value }))}
                  style={{ ...dropdownInput, padding: 2, height: 34 }} />
              </DropdownField>
              <DropdownField label="Style" style={{ flex: 1 }} theme={theme}>
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

      <ToolbarDivider />

      {/* Clear */}
      <ToolbarBtn
        onClick={() => {
          if (confirm('Clear all tasks and lanes? This cannot be undone.')) {
            clearAll()
          }
        }}
        title="Clear all tasks and lanes"
      >
        <ResetIcon /> <span>Clear</span>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '0 8px',
          height: 32,
          border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: 7,
          background: darkMode ? 'rgba(255,255,255,0.08)' : 'transparent',
          cursor: 'pointer',
          color: darkMode ? T.green : T.midGray,
          alignSelf: 'center',
          transition: 'background 0.15s, color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.hover }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = darkMode ? 'rgba(255,255,255,0.08)' : 'transparent' }}
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
        {darkMode
          ? <span style={{ fontSize: 11, color: T.midGray }}>Light</span>
          : <span style={{ fontSize: 11, color: T.midGray }}>Dark</span>
        }
      </button>

      <ToolbarDivider />

      {/* Export to PPTX */}
      <button
        onClick={handleExport}
        disabled={exporting || !projectId}
        title="Export to PowerPoint (Tiimely branded)"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 12px',
          height: 32,
          border: 'none',
          borderRadius: 7,
          background: exporting ? 'rgba(117,250,171,0.4)' : '#75FAAB',
          color: '#141413',
          cursor: exporting || !projectId ? 'not-allowed' : 'pointer',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          alignSelf: 'center',
          flexShrink: 0,
          opacity: (!projectId) ? 0.5 : 1,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (!exporting && projectId) (e.currentTarget as HTMLElement).style.background = '#55F366' }}
        onMouseLeave={(e) => { if (!exporting) (e.currentTarget as HTMLElement).style.background = '#75FAAB' }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9v2a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9"/>
          <polyline points="4,6 6.5,8.5 9,6"/>
          <line x1="6.5" y1="1" x2="6.5" y2="8.5"/>
        </svg>
        {exporting ? 'Exporting…' : 'Export PPTX'}
      </button>
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
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px',
        border: 'none', borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
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

function Dropdown({ children, onClose, right, theme }: { children: React.ReactNode; onClose: () => void; right?: boolean; theme: Theme }) {
  return (
    <div style={{
      position: 'absolute',
      top: 48, [right ? 'right' : 'left']: 0,
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      padding: 18,
      boxShadow: theme.isDark
        ? '0 8px 32px rgba(0,0,0,0.5)'
        : '0 8px 32px rgba(0,4,4,0.12)',
      zIndex: 100,
      minWidth: 250,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {children}
    </div>
  )
}

function DropdownField({ label, children, style, theme }: { label: string; children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: theme.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </label>
      {children}
    </div>
  )
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
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5a5 5 0 1 0 1-3" /><polyline points="2.5,2.5 2.5,7.5 7.5,7.5" /></svg>
}
function RedoIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 7.5a5 5 0 1 1-1-3" /><polyline points="12.5,2.5 12.5,7.5 7.5,7.5" /></svg>
}
function MoonIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 9.3A6 6 0 0 1 4.7 2a6 6 0 1 0 7.3 7.3z" /></svg>
}
function SunIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="7" cy="7" r="2.5"/><line x1="7" y1="1" x2="7" y2="2.5"/><line x1="7" y1="11.5" x2="7" y2="13"/><line x1="1" y1="7" x2="2.5" y2="7"/><line x1="11.5" y1="7" x2="13" y2="7"/><line x1="2.9" y1="2.9" x2="3.96" y2="3.96"/><line x1="10.04" y1="10.04" x2="11.1" y2="11.1"/><line x1="11.1" y1="2.9" x2="10.04" y2="3.96"/><line x1="3.96" y1="10.04" x2="2.9" y2="11.1"/></svg>
}
function ZoomInIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="5.5" cy="5.5" r="4"/><line x1="8.5" y1="8.5" x2="12" y2="12"/><line x1="3.5" y1="5.5" x2="7.5" y2="5.5"/><line x1="5.5" y1="3.5" x2="5.5" y2="7.5"/></svg>
}
function ZoomOutIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="5.5" cy="5.5" r="4"/><line x1="8.5" y1="8.5" x2="12" y2="12"/><line x1="3.5" y1="5.5" x2="7.5" y2="5.5"/></svg>
}
function ResetIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5A4.5 4.5 0 0 1 9.5 2.5"/><path d="M11 6.5A4.5 4.5 0 0 1 3.5 10.5"/><polyline points="2,2 2,6.5 6.5,6.5"/><polyline points="11,11 11,6.5 6.5,6.5"/></svg>
}
