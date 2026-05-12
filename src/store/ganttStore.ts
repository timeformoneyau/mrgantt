import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { Task, Row, Divider, Dependency, ViewState, Snapshot } from '@/types'
import { TASK_COLORS } from '@/lib/colors'
import { getDefaultViewState, formatDate } from '@/lib/timeline'
import { addDays } from 'date-fns'

// ---------------------------------------------------------------------------
// Supabase sync helpers
// ---------------------------------------------------------------------------
async function loadFromServer(id: string): Promise<{ data: Snapshot | null; error: boolean }> {
  try {
    const res = await fetch(`/api/gantt?id=${id}`)
    if (!res.ok) return { data: null, error: true }
    const { data } = await res.json()
    return { data: data ?? null, error: false }
  } catch {
    return { data: null, error: true }
  }
}

async function saveToServer(id: string, snapshot: Snapshot): Promise<boolean> {
  try {
    const res = await fetch(`/api/gantt?id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    })
    return res.ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Initial demo data
// ---------------------------------------------------------------------------
function makeInitialData() {
  const today = new Date()
  const fmt = (d: Date) => formatDate(d)

  const rows: Row[] = [
    { id: 'group-planning', name: 'Planning', order: 0, type: 'group', collapsed: false },
    { id: 'row-1', name: 'Product', order: 0, type: 'lane', parentGroupId: 'group-planning' },
    { id: 'row-2', name: 'Design', order: 1, type: 'lane', parentGroupId: 'group-planning' },
    { id: 'row-3', name: 'Engineering', order: 2, type: 'lane', parentGroupId: 'group-planning' },
    { id: 'row-unassigned', name: 'Staging', order: 9999, isSystem: true, type: 'system' },
  ]

  // Use the first 6 entries from the Tiimely palette in order
  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Discovery & Research',
      description: 'User interviews, market analysis',
      owner: 'Alice',
      startDate: fmt(addDays(today, -5)),
      endDate: fmt(addDays(today, 10)),
      color: TASK_COLORS[0], // Forest Green #084A3C
      rowId: 'row-1',
    },
    {
      id: 'task-2',
      title: 'Wireframes',
      description: 'Low-fidelity sketches and flow maps',
      owner: 'Bob',
      startDate: fmt(addDays(today, 3)),
      endDate: fmt(addDays(today, 18)),
      color: TASK_COLORS[2], // Teal #1FE7DC
      rowId: 'row-2',
    },
    {
      id: 'task-3',
      title: 'API Design',
      description: 'Define endpoints and data contracts',
      owner: 'Carol',
      startDate: fmt(addDays(today, 8)),
      endDate: fmt(addDays(today, 22)),
      color: TASK_COLORS[3], // Dark Teal #357762
      rowId: 'row-3',
    },
    {
      id: 'task-4',
      title: 'Visual Design',
      description: 'Hi-fi mocks and design system',
      owner: 'Bob',
      startDate: fmt(addDays(today, 20)),
      endDate: fmt(addDays(today, 38)),
      color: TASK_COLORS[1], // Tiimely Green #55F366
      rowId: 'row-2',
    },
    {
      id: 'task-5',
      title: 'Frontend Build',
      description: 'Implement UI components',
      owner: 'Dave',
      startDate: fmt(addDays(today, 25)),
      endDate: fmt(addDays(today, 50)),
      color: TASK_COLORS[8], // Mid Forest #3A7D64
      rowId: 'row-3',
    },
    {
      id: 'task-6',
      title: 'Beta Launch',
      description: 'Limited rollout to early users',
      owner: 'Alice',
      startDate: fmt(addDays(today, 55)),
      endDate: fmt(addDays(today, 62)),
      color: TASK_COLORS[5], // Sky Blue #81ECF5
      rowId: 'row-1',
    },
  ]

  const dividers: Divider[] = [
    {
      id: 'div-1',
      date: fmt(addDays(today, 30)),
      label: 'Design Freeze',
      color: TASK_COLORS[1], // Tiimely Green #55F366
      style: 'solid',
    },
  ]

  const dependencies: Dependency[] = [
    { id: 'dep-1', fromTaskId: 'task-2', toTaskId: 'task-4' },
    { id: 'dep-2', fromTaskId: 'task-3', toTaskId: 'task-5' },
  ]

  return { rows, tasks, dividers, dependencies }
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------
interface GanttStore {
  // Data
  tasks: Task[]
  rows: Row[]
  dividers: Divider[]
  dependencies: Dependency[]

  // Project
  projectId: string | null

  // View / UI
  viewState: ViewState
  selectedTaskId: string | null
  sidePanelOpen: boolean
  darkMode: boolean

  // Transient editing state (not persisted)
  editingRowId: string | null
  newRowId: string | null

  // Undo / redo stacks (not persisted)
  past: Snapshot[]
  future: Snapshot[]

  // Internal
  _colorIndex: number
  syncStatus: 'idle' | 'saving' | 'saved' | 'error'

  // ---- Actions ----

  // Project
  setProjectId: (id: string) => void

  // View
  setViewState: (updates: Partial<ViewState>) => void
  selectTask: (id: string | null) => void
  setSidePanelOpen: (open: boolean) => void
  toggleDarkMode: () => void

  // Tasks
  addTask: (
    partial: Omit<Task, 'id' | 'color' | 'rowId'> & { color?: string; rowId?: string }
  ) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void

  // Rows
  addRow: (name?: string) => void
  updateRow: (id: string, updates: Partial<Row>) => void
  deleteRow: (id: string) => void
  moveRowUp: (id: string) => void
  moveRowDown: (id: string) => void

  // Groups & Lanes
  addGroup: (name?: string) => string
  toggleGroup: (groupId: string) => void
  addLane: (opts?: { groupId?: string; name?: string }) => string
  moveLaneToGroup: (laneId: string, groupId: string) => void
  reorderRows: (dragId: string, targetId: string, position: 'before' | 'after' | 'into') => void
  beginEditRow: (rowId: string) => void
  endEditRow: () => void

  // Dividers
  addDivider: (d: Omit<Divider, 'id'>) => void
  updateDivider: (id: string, updates: Partial<Divider>) => void
  deleteDivider: (id: string) => void

  // Dependencies
  addDependency: (fromTaskId: string, toTaskId: string) => void
  deleteDependency: (id: string) => void

  // History
  undo: () => void
  redo: () => void
  _pushHistory: () => void
  _save: () => void

  // Reset
  resetToDemo: () => void

  // Clear
  clearAll: () => void

  // Server sync
  syncFromServer: (id: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------
const initial = makeInitialData()

export const useGanttStore = create<GanttStore>()(
  persist(
    (set, get) => ({
      // Initial state
      projectId: null,
      tasks: initial.tasks,
      rows: initial.rows,
      dividers: initial.dividers,
      dependencies: initial.dependencies,
      viewState: getDefaultViewState('1q'),
      selectedTaskId: null,
      sidePanelOpen: false,
      darkMode: false,
      editingRowId: null,
      newRowId: null,
      past: [],
      future: [],
      _colorIndex: initial.tasks.length,
      syncStatus: 'idle' as const,

      // ---------------------------------------------------------------
      // Internal helpers
      // ---------------------------------------------------------------
      _pushHistory: () => {
        const { tasks, rows, dividers, dependencies, past } = get()
        const snapshot: Snapshot = {
          tasks: JSON.parse(JSON.stringify(tasks)),
          rows: JSON.parse(JSON.stringify(rows)),
          dividers: JSON.parse(JSON.stringify(dividers)),
          dependencies: JSON.parse(JSON.stringify(dependencies)),
        }
        set({ past: [...past.slice(-49), snapshot], future: [] })
      },

      // Save current state to server (call after any data mutation)
      _save: () => {
        const { projectId, tasks, rows, dividers, dependencies } = get()
        if (!projectId) return
        set({ syncStatus: 'saving' })
        saveToServer(projectId, { tasks, rows, dividers, dependencies }).then((ok) => {
          set({ syncStatus: ok ? 'saved' : 'error' })
          if (ok) {
            setTimeout(() => {
              if (get().syncStatus === 'saved') set({ syncStatus: 'idle' })
            }, 2000)
          }
        })
      },

      // ---------------------------------------------------------------
      // Project
      // ---------------------------------------------------------------
      setProjectId: (id) => set({ projectId: id }),

      // ---------------------------------------------------------------
      // View
      // ---------------------------------------------------------------
      setViewState: (updates) =>
        set((s) => ({ viewState: { ...s.viewState, ...updates } })),

      selectTask: (id) =>
        set({ selectedTaskId: id, sidePanelOpen: id !== null }),

      setSidePanelOpen: (open) => set({ sidePanelOpen: open }),

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

      // ---------------------------------------------------------------
      // Tasks
      // ---------------------------------------------------------------
      addTask: (partial) => {
        // Reject invalid date range
        if (partial.startDate > partial.endDate) return ''
        get()._pushHistory()
        const { _colorIndex } = get()
        // Single source of truth: Tiimely palette from colors.ts
        const color = partial.color ?? TASK_COLORS[_colorIndex % TASK_COLORS.length]
        const id = uuidv4()
        const task: Task = {
          ...partial,
          id,
          color,
          description: partial.description ?? '',
          owner: partial.owner ?? '',
          rowId: partial.rowId ?? 'row-unassigned',
        }
        set((s) => ({
          tasks: [...s.tasks, task],
          _colorIndex: s._colorIndex + (partial.color ? 0 : 1),
        }))
        get()._save()
        return id
      },

      updateTask: (id, updates) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return

        // Enforce startDate <= endDate, clamping to a 1-day task rather than allowing inversion
        let safeUpdates = { ...updates }
        const nextStart = updates.startDate ?? task.startDate
        const nextEnd = updates.endDate ?? task.endDate
        if (nextStart > nextEnd) {
          if (updates.startDate !== undefined && updates.endDate === undefined) {
            safeUpdates = { ...safeUpdates, endDate: updates.startDate }
          } else if (updates.endDate !== undefined && updates.startDate === undefined) {
            safeUpdates = { ...safeUpdates, startDate: updates.endDate }
          } else {
            return
          }
        }

        get()._pushHistory()
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...safeUpdates } : t)),
        }))
        get()._save()
      },

      deleteTask: (id) => {
        get()._pushHistory()
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          dependencies: s.dependencies.filter(
            (d) => d.fromTaskId !== id && d.toTaskId !== id
          ),
          selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
          sidePanelOpen: s.selectedTaskId === id ? false : s.sidePanelOpen,
        }))
        get()._save()
      },

      // ---------------------------------------------------------------
      // Rows
      // ---------------------------------------------------------------
      addRow: (name?: string) => {
        const id = get().addLane({ name })
        get().beginEditRow(id)
      },

      updateRow: (id, updates) => {
        get()._pushHistory()
        set((s) => ({
          rows: s.rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }))
        get()._save()
      },

      deleteRow: (id) => {
        const row = get().rows.find((r) => r.id === id)
        if (row?.isSystem || row?.type === 'system') return
        get()._pushHistory()
        if (row?.type === 'group') {
          const childIds = new Set(get().rows.filter(r => r.parentGroupId === id).map(r => r.id))
          set(s => ({
            rows: s.rows.filter(r => r.id !== id && r.parentGroupId !== id),
            tasks: s.tasks.filter(t => !childIds.has(t.rowId)),
            selectedTaskId: childIds.has(s.selectedTaskId ?? '') ? null : s.selectedTaskId,
            sidePanelOpen: childIds.has(s.selectedTaskId ?? '') ? false : s.sidePanelOpen,
          }))
        } else {
          set(s => ({
            rows: s.rows.filter(r => r.id !== id),
            tasks: s.tasks.filter(t => t.rowId !== id),
            selectedTaskId: s.selectedTaskId && s.tasks.find(t => t.id === s.selectedTaskId)?.rowId === id ? null : s.selectedTaskId,
            sidePanelOpen: s.selectedTaskId && s.tasks.find(t => t.id === s.selectedTaskId)?.rowId === id ? false : s.sidePanelOpen,
          }))
        }
        get()._save()
      },

      moveRowUp: (id) => {
        const row = get().rows.find(r => r.id === id)
        if (!row || row.isSystem || row.type === 'system') return
        get()._pushHistory()
        set(s => {
          if (row.type === 'group') {
            const sorted = s.rows.filter(r => r.type === 'group').sort((a, b) => a.order - b.order)
            const idx = sorted.findIndex(r => r.id === id)
            if (idx <= 0) return {}
            return {
              rows: s.rows.map(r => {
                if (r.id === id) return { ...r, order: sorted[idx - 1].order }
                if (r.id === sorted[idx - 1].id) return { ...r, order: sorted[idx].order }
                return r
              })
            }
          } else {
            const sorted = s.rows.filter(r => r.parentGroupId === row.parentGroupId && r.type === 'lane').sort((a, b) => a.order - b.order)
            const idx = sorted.findIndex(r => r.id === id)
            if (idx <= 0) return {}
            return {
              rows: s.rows.map(r => {
                if (r.id === id) return { ...r, order: sorted[idx - 1].order }
                if (r.id === sorted[idx - 1].id) return { ...r, order: sorted[idx].order }
                return r
              })
            }
          }
        })
        get()._save()
      },

      moveRowDown: (id) => {
        const row = get().rows.find(r => r.id === id)
        if (!row || row.isSystem || row.type === 'system') return
        get()._pushHistory()
        set(s => {
          if (row.type === 'group') {
            const sorted = s.rows.filter(r => r.type === 'group').sort((a, b) => a.order - b.order)
            const idx = sorted.findIndex(r => r.id === id)
            if (idx >= sorted.length - 1) return {}
            return {
              rows: s.rows.map(r => {
                if (r.id === id) return { ...r, order: sorted[idx + 1].order }
                if (r.id === sorted[idx + 1].id) return { ...r, order: sorted[idx].order }
                return r
              })
            }
          } else {
            const sorted = s.rows.filter(r => r.parentGroupId === row.parentGroupId && r.type === 'lane').sort((a, b) => a.order - b.order)
            const idx = sorted.findIndex(r => r.id === id)
            if (idx >= sorted.length - 1) return {}
            return {
              rows: s.rows.map(r => {
                if (r.id === id) return { ...r, order: sorted[idx + 1].order }
                if (r.id === sorted[idx + 1].id) return { ...r, order: sorted[idx].order }
                return r
              })
            }
          }
        })
        get()._save()
      },

      // ---------------------------------------------------------------
      // Groups & Lanes
      // ---------------------------------------------------------------
      addGroup: (name) => {
        get()._pushHistory()
        const { rows } = get()
        const groups = rows.filter(r => r.type === 'group')
        const nextOrder = groups.length > 0 ? Math.max(...groups.map(r => r.order)) + 1 : 0
        const id = uuidv4()
        const group: Row = { id, name: name ?? 'New Group', order: nextOrder, type: 'group', collapsed: false }
        set(s => ({ rows: [...s.rows, group] }))
        get()._save()
        get().beginEditRow(id)
        return id
      },

      toggleGroup: (groupId) => {
        set(s => ({ rows: s.rows.map(r => r.id === groupId ? { ...r, collapsed: !r.collapsed } : r) }))
        get()._save()
      },

      addLane: (opts: { groupId?: string; name?: string } = {}) => {
        get()._pushHistory()
        const { rows } = get()
        const groups = rows.filter(r => r.type === 'group').sort((a, b) => a.order - b.order)
        const targetGroupId = opts.groupId ?? groups[0]?.id
        const siblings = rows.filter(r => targetGroupId ? r.parentGroupId === targetGroupId : (!r.type && !r.isSystem))
        const nextOrder = siblings.length > 0 ? Math.max(...siblings.map(r => r.order)) + 1 : 0
        const id = uuidv4()
        const lane: Row = {
          id, name: opts.name ?? '', order: nextOrder, type: 'lane',
          ...(targetGroupId ? { parentGroupId: targetGroupId } : {}),
        }
        set(s => ({ rows: [...s.rows, lane] }))
        get()._save()
        return id
      },

      moveLaneToGroup: (laneId, groupId) => {
        const lane = get().rows.find(r => r.id === laneId)
        if (!lane || lane.type !== 'lane') return
        get()._pushHistory()
        const siblings = get().rows.filter(r => r.parentGroupId === groupId)
        const nextOrder = siblings.length > 0 ? Math.max(...siblings.map(r => r.order)) + 1 : 0
        set(s => ({
          rows: s.rows.map(r => r.id === laneId ? { ...r, parentGroupId: groupId, order: nextOrder } : r),
        }))
        get()._save()
      },

      reorderRows: (dragId, targetId, position) => {
        const { rows } = get()
        const drag = rows.find(r => r.id === dragId)
        const target = rows.find(r => r.id === targetId)
        if (!drag || !target || dragId === targetId) return

        get()._pushHistory()

        if (drag.type === 'group') {
          // Reorder groups — only before/after other groups
          const groups = rows.filter(r => r.type === 'group').sort((a, b) => a.order - b.order)
          const withoutDrag = groups.filter(g => g.id !== dragId)
          const targetIdx = withoutDrag.findIndex(g => g.id === targetId)
          if (targetIdx < 0) return
          const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
          withoutDrag.splice(insertIdx, 0, drag)
          set(s => ({
            rows: s.rows.map(r => {
              const idx = withoutDrag.findIndex(g => g.id === r.id)
              return idx >= 0 ? { ...r, order: idx } : r
            }),
          }))
        } else {
          // Lane reorder
          if (position === 'into') {
            // Drop onto group header — append as last child of that group
            const siblings = rows.filter(r => r.parentGroupId === targetId && r.id !== dragId)
            const nextOrder = siblings.length > 0 ? Math.max(...siblings.map(r => r.order)) + 1 : 0
            set(s => ({
              rows: s.rows.map(r => r.id === dragId ? { ...r, parentGroupId: targetId, order: nextOrder } : r),
            }))
          } else {
            // before/after another lane — may cross group boundary
            const newGroupId = target.parentGroupId
            const siblings = rows
              .filter(r => r.parentGroupId === newGroupId && r.id !== dragId)
              .sort((a, b) => a.order - b.order)
            const targetIdx = siblings.findIndex(r => r.id === targetId)
            if (targetIdx < 0) return
            const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
            siblings.splice(insertIdx, 0, drag)
            set(s => ({
              rows: s.rows.map(r => {
                const idx = siblings.findIndex(u => u.id === r.id)
                return idx >= 0 ? { ...r, order: idx, parentGroupId: newGroupId } : r
              }),
            }))
          }
        }

        get()._save()
      },

      beginEditRow: (rowId) => set({ editingRowId: rowId, newRowId: rowId }),
      endEditRow: () => set({ editingRowId: null, newRowId: null }),

      // ---------------------------------------------------------------
      // Dividers
      // ---------------------------------------------------------------
      addDivider: (d) => {
        get()._pushHistory()
        set((s) => ({
          dividers: [...s.dividers, { ...d, id: uuidv4() }],
        }))
        get()._save()
      },

      updateDivider: (id, updates) => {
        get()._pushHistory()
        set((s) => ({
          dividers: s.dividers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }))
        get()._save()
      },

      deleteDivider: (id) => {
        get()._pushHistory()
        set((s) => ({ dividers: s.dividers.filter((d) => d.id !== id) }))
        get()._save()
      },

      // ---------------------------------------------------------------
      // Dependencies
      // ---------------------------------------------------------------
      addDependency: (fromTaskId, toTaskId) => {
        // Prevent self-reference and duplicates
        if (fromTaskId === toTaskId) return
        const { dependencies } = get()
        const exists = dependencies.some(
          (d) => d.fromTaskId === fromTaskId && d.toTaskId === toTaskId
        )
        if (exists) return
        get()._pushHistory()
        set((s) => ({
          dependencies: [
            ...s.dependencies,
            { id: uuidv4(), fromTaskId, toTaskId },
          ],
        }))
        get()._save()
      },

      deleteDependency: (id) => {
        get()._pushHistory()
        set((s) => ({
          dependencies: s.dependencies.filter((d) => d.id !== id),
        }))
        get()._save()
      },

      // ---------------------------------------------------------------
      // Undo / Redo
      // ---------------------------------------------------------------
      undo: () => {
        const { past, tasks, rows, dividers, dependencies, future } = get()
        if (past.length === 0) return
        const previous = past[past.length - 1]
        const currentSnapshot: Snapshot = {
          tasks: JSON.parse(JSON.stringify(tasks)),
          rows: JSON.parse(JSON.stringify(rows)),
          dividers: JSON.parse(JSON.stringify(dividers)),
          dependencies: JSON.parse(JSON.stringify(dependencies)),
        }
        set({
          ...previous,
          past: past.slice(0, -1),
          future: [currentSnapshot, ...future.slice(0, 49)],
        })
      },

      redo: () => {
        const { future, tasks, rows, dividers, dependencies, past } = get()
        if (future.length === 0) return
        const next = future[0]
        const currentSnapshot: Snapshot = {
          tasks: JSON.parse(JSON.stringify(tasks)),
          rows: JSON.parse(JSON.stringify(rows)),
          dividers: JSON.parse(JSON.stringify(dividers)),
          dependencies: JSON.parse(JSON.stringify(dependencies)),
        }
        set({
          ...next,
          future: future.slice(1),
          past: [...past.slice(0, 49), currentSnapshot],
        })
      },

      resetToDemo: () => {
        const freshData = makeInitialData()
        set({
          tasks: freshData.tasks,
          rows: freshData.rows,
          dividers: freshData.dividers,
          dependencies: freshData.dependencies,
          viewState: getDefaultViewState('1q'),
          selectedTaskId: null,
          sidePanelOpen: false,
          past: [],
          future: [],
          _colorIndex: freshData.tasks.length,
        })
      },

      clearAll: () => {
        const defaultGroup: Row = { id: 'group-default', name: 'Ungrouped', order: 0, type: 'group', collapsed: false }
        const systemRow: Row = { id: 'row-unassigned', name: 'Staging', order: 9999, isSystem: true, type: 'system' }
        set({
          tasks: [], rows: [defaultGroup, systemRow],
          dividers: [], dependencies: [], past: [], future: [],
          selectedTaskId: null, sidePanelOpen: false,
        })
        const pid = get().projectId
        if (pid) saveToServer(pid, { tasks: [], rows: [defaultGroup, systemRow], dividers: [], dependencies: [] })
      },

      syncFromServer: async (id: string) => {
        const { data, error } = await loadFromServer(id)
        if (error) { set({ syncStatus: 'error' }); return }
        if (!data) return
        let rows = data.rows
        const needsMigration = !rows.some(r => r.type === 'group')
        if (needsMigration) {
          const ungroupedId = 'group-ungrouped'
          rows = [
            { id: ungroupedId, name: 'Ungrouped', order: 0, type: 'group' as const, collapsed: false },
            ...rows.filter(r => !r.isSystem).map(r => ({ ...r, type: 'lane' as const, parentGroupId: ungroupedId })),
            ...rows.filter(r => r.isSystem).map(r => ({ ...r, type: 'system' as const })),
          ]
        }
        set({ tasks: data.tasks, rows, dividers: data.dividers, dependencies: data.dependencies, past: [], future: [], syncStatus: 'idle' })
        if (needsMigration) saveToServer(id, { tasks: data.tasks, rows, dividers: data.dividers, dependencies: data.dependencies })
      },
    }),
    {
      name: 'mrgant-v7',
      // Only persist data + view — not UI state, history stacks, or sync status
      partialize: (state) => ({
        tasks: state.tasks,
        rows: state.rows,
        dividers: state.dividers,
        dependencies: state.dependencies,
        viewState: state.viewState,
        _colorIndex: state._colorIndex,
        darkMode: state.darkMode,
      }),
    }
  )
)
