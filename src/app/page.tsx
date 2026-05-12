'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Project {
  id: number
  name: string
  updated_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load charts')
        return r.json()
      })
      .then(d => { setProjects(d.projects ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.focus()
  }, [renamingId])

  async function createProject() {
    const name = newName.trim() || 'Untitled'
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create chart')
      const { project } = await res.json()
      if (!project?.id) throw new Error('Unexpected response from server')
      setCreating(false)
      setNewName('')
      router.push(`/chart/${project.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create chart')
    }
  }

  async function deleteProject(id: number) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete chart')
      setProjects(p => p.filter(x => x.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete chart')
    } finally {
      setDeletingId(null)
    }
  }

  async function renameProject(id: number) {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to rename chart')
      setProjects(p => p.map(x => x.id === id ? { ...x, name } : x))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to rename chart')
    } finally {
      setRenamingId(null)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#0a0a09', color: '#fbf9f3', fontFamily: "'Inter', 'Poppins', Arial, sans-serif" },
    header: { borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#55F366' },
    body: { maxWidth: '960px', margin: '0 auto', padding: '48px 40px' },
    sectionTitle: { fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(251,249,243,0.4)', marginBottom: '20px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
    card: { background: '#161614', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', cursor: 'pointer', position: 'relative', transition: 'border-color 0.15s, background 0.15s' },
    cardName: { fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#fbf9f3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '60px' },
    cardMeta: { fontSize: '12px', color: 'rgba(251,249,243,0.4)' },
    cardActions: { position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '4px' },
    iconBtn: { background: 'none', border: 'none', color: 'rgba(251,249,243,0.35)', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', fontSize: '13px', lineHeight: '1' },
    newCard: { background: 'transparent', border: '1px dashed rgba(85,243,102,0.25)', borderRadius: '12px', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(85,243,102,0.6)', fontSize: '14px', fontWeight: 500, width: '100%', transition: 'border-color 0.15s, color 0.15s' },
    createForm: { background: '#161614', border: '1px solid rgba(85,243,102,0.4)', borderRadius: '12px', padding: '20px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fbf9f3', padding: '8px 12px', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' },
    btnRow: { display: 'flex', gap: '8px' },
    btnPrimary: { background: '#55F366', color: '#0a0a09', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'rgba(255,255,255,0.07)', color: 'rgba(251,249,243,0.6)', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' },
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo}>mr gant</div>
        <div style={{ fontSize: '13px', color: 'rgba(251,249,243,0.3)' }}>Timeline Builder</div>
      </header>
      <main style={s.body}>
        <div style={s.sectionTitle}>Your Charts</div>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: '#ff6b6b',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 0 0 12px' }}
            >×</button>
          </div>
        )}
        {loading ? (
          <div style={{ color: 'rgba(251,249,243,0.3)', fontSize: '14px' }}>Loading...</div>
        ) : (
          <div style={s.grid}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                isRenaming={renamingId === p.id}
                renameValue={renameValue}
                renameRef={renameRef}
                isDeleting={deletingId === p.id}
                onOpen={() => router.push(`/chart/${p.id}`)}
                onRenameStart={() => { setRenamingId(p.id); setRenameValue(p.name) }}
                onRenameChange={setRenameValue}
                onRenameCommit={() => renameProject(p.id)}
                onRenameCancel={() => setRenamingId(null)}
                onDelete={() => deleteProject(p.id)}
                s={s}
              />
            ))}
            {creating ? (
              <div style={s.createForm}>
                <input
                  ref={inputRef}
                  style={s.input}
                  placeholder="Chart name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') createProject()
                    if (e.key === 'Escape') { setCreating(false); setNewName('') }
                  }}
                />
                <div style={s.btnRow}>
                  <button style={s.btnPrimary} onClick={createProject}>Create</button>
                  <button style={s.btnSecondary} onClick={() => { setCreating(false); setNewName('') }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button style={s.newCard} onClick={() => setCreating(true)}>
                <span style={{ fontSize: '20px', lineHeight: '1' }}>+</span>
                New Chart
              </button>
            )}
          </div>
        )}
        {!loading && projects.length === 0 && !creating && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(251,249,243,0.3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', marginBottom: '4px', color: 'rgba(251,249,243,0.5)' }}>No charts yet</div>
            <div style={{ fontSize: '13px' }}>Click &quot;New Chart&quot; to get started</div>
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectCard({ project, isRenaming, renameValue, renameRef, isDeleting, onOpen, onRenameStart, onRenameChange, onRenameCommit, onRenameCancel, onDelete, s }: {
  project: Project; isRenaming: boolean; renameValue: string; renameRef: React.RefObject<HTMLInputElement | null>
  isDeleting: boolean; onOpen: () => void; onRenameStart: () => void; onRenameChange: (v: string) => void
  onRenameCommit: () => void; onRenameCancel: () => void; onDelete: () => void; s: Record<string, React.CSSProperties>
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ ...s.card, ...(hovered ? { background: '#1e1e1b', borderColor: 'rgba(85,243,102,0.3)' } : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={!isRenaming ? onOpen : undefined}
    >
      {isRenaming ? (
        <input
          ref={renameRef}
          style={{ ...s.input, marginBottom: 0 }}
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCancel() }}
          onBlur={onRenameCommit}
        />
      ) : (
        <>
          <div style={s.cardName}>{project.name}</div>
          <div style={s.cardMeta}>Updated {timeAgo(project.updated_at)}</div>
          <div style={s.cardActions} onClick={e => e.stopPropagation()}>
            <button style={s.iconBtn} title="Rename" onClick={onRenameStart}>✏️</button>
            <button style={{ ...s.iconBtn, opacity: isDeleting ? 0.4 : 1 }} title="Delete" onClick={onDelete}>🗑</button>
          </div>
        </>
      )}
    </div>
  )
}
