'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Task } from '@/types'
import { useGanttStore } from '@/store/ganttStore'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { parseDate } from '@/lib/timeline'

interface TaskSidePanelProps {
  taskId: string
  onClose: () => void
}

export function TaskSidePanel({ taskId, onClose }: TaskSidePanelProps) {
  const { tasks, rows, dependencies, updateTask, deleteTask, addDependency, deleteDependency } = useGanttStore()
  const task = tasks.find((t) => t.id === taskId)
  const sortedRows = [...rows].sort((a, b) => a.order - b.order)
  const [form, setForm] = useState<Omit<Task, 'id'> | null>(null)
  const [showDepPicker, setShowDepPicker] = useState(false)

  useEffect(() => { if (task) setForm({ ...task }) }, [taskId]) // eslint-disable-line

  if (!task || !form) return null

  const taskDeps = dependencies.filter((d) => d.toTaskId === taskId)
  const taskDepsOut = dependencies.filter((d) => d.fromTaskId === taskId)

  function commit(updates: Partial<Task>) {
    updateTask(taskId, updates)
    setForm((f) => (f ? { ...f, ...updates } : f))
  }

  function handleDelete() {
    if (confirm(`Delete "${task?.title}"?`)) { deleteTask(taskId); onClose() }
  }

  const availableForDep = tasks.filter((t) =>
    t.id !== taskId &&
    !taskDeps.some((d) => d.fromTaskId === t.id) &&
    !taskDepsOut.some((d) => d.toTaskId === t.id)
  )

  const durationDays = Math.max(1, Math.round(
    (parseDate(form.endDate).getTime() - parseDate(form.startDate).getTime()) / 86400000
  ) + 1)

  return (
    <div style={{
      width: 320, minWidth: 320, height: '100%',
      background: '#FFFFFF',
      borderLeft: '1px solid #E8E6DE',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid #F0EEE8',
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#FAFAF7',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: task.color, flexShrink: 0 }} />
        <span style={{
          fontWeight: 700, fontSize: 13, color: '#000404', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: "'Poppins', Arial, sans-serif",
        }}>
          {task.title}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0AEA5', fontSize: 18, lineHeight: 1, padding: 2, borderRadius: 4 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#000404' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#B0AEA5' }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
        <PanelField label="Title">
          <input type="text" value={form.title}
            onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
            onBlur={() => commit({ title: form.title })}
            onKeyDown={(e) => e.key === 'Enter' && commit({ title: form.title })}
            style={inputStyle} />
        </PanelField>

        <PanelField label="Owner">
          <input type="text" value={form.owner} placeholder="Unassigned"
            onChange={(e) => setForm((f) => (f ? { ...f, owner: e.target.value } : f))}
            onBlur={() => commit({ owner: form.owner })}
            style={inputStyle} />
        </PanelField>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <PanelField label="Start" style={{ flex: 1 }}>
            <input type="date" value={form.startDate}
              onChange={(e) => {
                const v = e.target.value
                if (v <= form.endDate) { setForm((f) => (f ? { ...f, startDate: v } : f)); commit({ startDate: v }) }
              }}
              style={inputStyle} />
          </PanelField>
          <PanelField label="End" style={{ flex: 1 }}>
            <input type="date" value={form.endDate} min={form.startDate}
              onChange={(e) => {
                const v = e.target.value
                if (v >= form.startDate) { setForm((f) => (f ? { ...f, endDate: v } : f)); commit({ endDate: v }) }
              }}
              style={inputStyle} />
          </PanelField>
        </div>

        {/* Duration pill */}
        <div style={{ marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 20,
            background: '#F0EEE8', fontSize: 11, fontWeight: 600,
            fontFamily: "'Poppins', Arial, sans-serif",
            color: '#000404',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.color, display: 'inline-block' }} />
            {durationDays} day{durationDays !== 1 ? 's' : ''} &nbsp;·&nbsp;
            {format(parseDate(form.startDate), 'MMM d')} – {format(parseDate(form.endDate), 'MMM d, yyyy')}
          </span>
        </div>

        <PanelField label="Lane">
          <select value={form.rowId}
            onChange={(e) => { setForm((f) => (f ? { ...f, rowId: e.target.value } : f)); commit({ rowId: e.target.value }) }}
            style={inputStyle}>
            {sortedRows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </PanelField>

        <PanelField label="Color">
          <ColorPicker value={form.color} onChange={(color) => { setForm((f) => (f ? { ...f, color } : f)); commit({ color }) }} />
        </PanelField>

        <PanelField label="Description">
          <textarea value={form.description} placeholder="Add notes…"
            onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
            onBlur={() => commit({ description: form.description })}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: "'Poppins', Arial, sans-serif" }} />
        </PanelField>

        {/* Depends on */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={fieldLabelStyle}>Depends on</span>
            <button onClick={() => setShowDepPicker((v) => !v)} style={{
              fontSize: 11, fontWeight: 700, color: '#55F366',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: "'Poppins', Arial, sans-serif",
            }}>+ Add</button>
          </div>
          {taskDeps.length === 0 && (
            <div style={{ fontSize: 12, color: '#B0AEA5', fontStyle: 'italic', fontFamily: "'Poppins', Arial" }}>None</div>
          )}
          {taskDeps.map((dep) => {
            const fromTask = tasks.find((t) => t.id === dep.fromTaskId)
            if (!fromTask) return null
            return (
              <DepChip key={dep.id} label={fromTask.title} color={fromTask.color} onRemove={() => deleteDependency(dep.id)} />
            )
          })}
          {showDepPicker && availableForDep.length > 0 && (
            <div style={{ marginTop: 6, border: '1px solid #E8E6DE', borderRadius: 8, overflow: 'hidden', maxHeight: 160, overflowY: 'auto' }}>
              {availableForDep.map((t) => (
                <button key={t.id} onClick={() => { addDependency(t.id, taskId); setShowDepPicker(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px', background: 'none', border: 'none',
                    borderBottom: '1px solid #F0EEE8', cursor: 'pointer',
                    textAlign: 'left', fontSize: 12, color: '#000404',
                    fontFamily: "'Poppins', Arial, sans-serif",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FBF9F3' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                </button>
              ))}
            </div>
          )}
          {showDepPicker && availableForDep.length === 0 && (
            <div style={{ fontSize: 12, color: '#B0AEA5', marginTop: 4, fontFamily: "'Poppins', Arial" }}>No available tasks</div>
          )}
        </div>

        {/* Blocks */}
        {taskDepsOut.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ ...fieldLabelStyle, display: 'block', marginBottom: 8 }}>Blocks</span>
            {taskDepsOut.map((dep) => {
              const toTask = tasks.find((t) => t.id === dep.toTaskId)
              if (!toTask) return null
              return <DepChip key={dep.id} label={toTask.title} color={toTask.color} onRemove={() => deleteDependency(dep.id)} />
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid #F0EEE8', display: 'flex', gap: 8 }}>
        <button onClick={handleDelete}
          style={{
            padding: '7px 14px', background: 'transparent',
            border: '1px solid #E8E6DE', color: '#000404',
            borderRadius: 7, fontSize: 12, fontWeight: 600,
            fontFamily: "'Poppins', Arial, sans-serif", cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#000404' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#E8E6DE' }}
        >
          Delete
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onClose}
          style={{
            padding: '7px 20px', background: '#55F366', border: 'none', color: '#000404',
            borderRadius: 7, fontSize: 12, fontWeight: 700,
            fontFamily: "'Poppins', Arial, sans-serif", cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fieldLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: '#B0AEA5',
  textTransform: 'uppercase', letterSpacing: '0.09em',
  fontFamily: "'Poppins', Arial, sans-serif",
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 9px',
  border: '1px solid #E8E6DE', borderRadius: 6,
  fontSize: 12, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Poppins', Arial, sans-serif",
  color: '#000404', background: '#fff',
}

function PanelField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ ...fieldLabelStyle, display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function DepChip({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 8px', background: '#FBF9F3',
      borderRadius: 6, marginBottom: 4, border: '1px solid #F0EEE8',
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12, color: '#000404', fontFamily: "'Poppins', Arial, sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <button onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0AEA5', fontSize: 14, lineHeight: 1, padding: 2 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#000404' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#B0AEA5' }}
      >×</button>
    </div>
  )
}
