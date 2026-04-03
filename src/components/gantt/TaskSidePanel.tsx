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
  const {
    tasks, rows, dependencies,
    updateTask, deleteTask, addDependency, deleteDependency,
  } = useGanttStore()

  const task = tasks.find((t) => t.id === taskId)
  const sortedRows = [...rows].sort((a, b) => a.order - b.order)

  const [form, setForm] = useState<Omit<Task, 'id'> | null>(null)
  const [showDepPicker, setShowDepPicker] = useState(false)

  useEffect(() => {
    if (task) {
      setForm({ ...task })
    }
  }, [taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!task || !form) return null

  const taskDeps = dependencies.filter((d) => d.toTaskId === taskId)
  const taskDepsOut = dependencies.filter((d) => d.fromTaskId === taskId)

  function commit(updates: Partial<Task>) {
    updateTask(taskId, updates)
    setForm((f) => (f ? { ...f, ...updates } : f))
  }

  function handleDelete() {
    if (confirm(`Delete "${task?.title}"?`)) {
      deleteTask(taskId)
      onClose()
    }
  }

  const availableForDep = tasks.filter(
    (t) =>
      t.id !== taskId &&
      !taskDeps.some((d) => d.fromTaskId === t.id) &&
      !taskDepsOut.some((d) => d.toTaskId === t.id)
  )

  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        height: '100%',
        background: '#ffffff',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: task.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            fontSize: 18,
            lineHeight: 1,
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Title */}
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
            onBlur={() => commit({ title: form.title })}
            onKeyDown={(e) => e.key === 'Enter' && commit({ title: form.title })}
            style={inputStyle}
          />
        </Field>

        {/* Owner */}
        <Field label="Owner">
          <input
            type="text"
            value={form.owner}
            placeholder="Unassigned"
            onChange={(e) => setForm((f) => (f ? { ...f, owner: e.target.value } : f))}
            onBlur={() => commit({ owner: form.owner })}
            style={inputStyle}
          />
        </Field>

        {/* Dates */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <Field label="Start date" style={{ flex: 1 }}>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => {
                const v = e.target.value
                if (v <= form.endDate) {
                  setForm((f) => (f ? { ...f, startDate: v } : f))
                  commit({ startDate: v })
                }
              }}
              style={inputStyle}
            />
          </Field>
          <Field label="End date" style={{ flex: 1 }}>
            <input
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) => {
                const v = e.target.value
                if (v >= form.startDate) {
                  setForm((f) => (f ? { ...f, endDate: v } : f))
                  commit({ endDate: v })
                }
              }}
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Duration display */}
        <div style={{ marginBottom: 14, fontSize: 12, color: '#9ca3af' }}>
          {Math.max(1, Math.round((parseDate(form.endDate).getTime() - parseDate(form.startDate).getTime()) / 86400000) + 1)} days &middot;{' '}
          {format(parseDate(form.startDate), 'MMM d')} – {format(parseDate(form.endDate), 'MMM d, yyyy')}
        </div>

        {/* Row */}
        <Field label="Lane">
          <select
            value={form.rowId}
            onChange={(e) => {
              setForm((f) => (f ? { ...f, rowId: e.target.value } : f))
              commit({ rowId: e.target.value })
            }}
            style={inputStyle}
          >
            {sortedRows.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>

        {/* Color */}
        <Field label="Color">
          <ColorPicker
            value={form.color}
            onChange={(color) => {
              setForm((f) => (f ? { ...f, color } : f))
              commit({ color })
            }}
          />
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={form.description}
            placeholder="Add notes…"
            onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
            onBlur={() => commit({ description: form.description })}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>

        {/* Dependencies — "depends on" */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={fieldLabelStyle}>Depends on</span>
            <button
              onClick={() => setShowDepPicker((v) => !v)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#6366f1',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              + Add
            </button>
          </div>

          {taskDeps.length === 0 && (
            <div style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>None</div>
          )}
          {taskDeps.map((dep) => {
            const fromTask = tasks.find((t) => t.id === dep.fromTaskId)
            if (!fromTask) return null
            return (
              <div
                key={dep.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  background: '#f9fafb',
                  borderRadius: 6,
                  marginBottom: 4,
                  border: '1px solid #f3f4f6',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: fromTask.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fromTask.title}
                </span>
                <button
                  onClick={() => deleteDependency(dep.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 2 }}
                >
                  ×
                </button>
              </div>
            )
          })}

          {showDepPicker && availableForDep.length > 0 && (
            <div
              style={{
                marginTop: 6,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              {availableForDep.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    addDependency(t.id, taskId)
                    setShowDepPicker(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 12,
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                </button>
              ))}
            </div>
          )}
          {showDepPicker && availableForDep.length === 0 && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>No available tasks to link</div>
          )}
        </div>

        {/* Outbound dependencies */}
        {taskDepsOut.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ ...fieldLabelStyle, display: 'block', marginBottom: 8 }}>Blocks</span>
            {taskDepsOut.map((dep) => {
              const toTask = tasks.find((t) => t.id === dep.toTaskId)
              if (!toTask) return null
              return (
                <div
                  key={dep.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 8px',
                    background: '#f9fafb',
                    borderRadius: 6,
                    marginBottom: 4,
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: toTask.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {toTask.title}
                  </span>
                  <button
                    onClick={() => deleteDependency(dep.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 2 }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={handleDelete}
          style={{
            padding: '7px 14px',
            background: 'transparent',
            border: '1px solid #fca5a5',
            color: '#ef4444',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fef2f2' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          Delete
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            padding: '7px 14px',
            background: '#f3f4f6',
            border: 'none',
            color: '#374151',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
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
  fontSize: 11,
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 9px',
  border: '1px solid #e5e7eb',
  borderRadius: 7,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#111827',
  background: '#fff',
  transition: 'border-color 0.15s',
}

function Field({
  label, children, style,
}: {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ ...fieldLabelStyle, display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
