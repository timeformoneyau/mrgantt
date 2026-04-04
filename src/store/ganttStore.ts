import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { Task, Row, Divider, Dependency, ViewState, Snapshot } from '@/types'
import { getNextColor } from '@/lib/colors'
import { getDefaultViewState, formatDate } from '@/lib/timeline'
import { addDays } from 'date-fns'

// ---------------------------------------------------------------------------
// Initial demo data
// ---------------------------------------------------------------------------
function makeInitialData() {
  const today = new Date()
  const fmt = (d: Date) => formatDate(d)

  const rows: Row[] = [
    { id: 'row-1', name: 'Product', order: 0 },
    { id: 'row-2', name: 'Design', order: 1 },
    { id: 'row-3', name: 'Engineering', order: 2 },
  ]

  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Discovery & Research',
      description: 'User interviews, market analysis',
      owner: 'Alice',
      startDate: fmt(addDays(today, -5)),
      endDate: fmt(addDays(today, 10)),
      color: '#6366f1',
      rowId: 'row-1',
    },
    {
      id: 'task-2',
      title: 'Wireframes',
      description: 'Low-fidelity sketches and flow maps',
      owner: 'Bob',
      startDate: fmt(addDays(today, 3)),
      endDate: fmt(addDays(today, 18)),
      color: '#8b5cf6',
      rowId: 'row-2',
    },
    {
      id: 'task-3',
      title: 'API Design',
      description: 'Define endpoints and data contracts',
      owner: 'Carol',
      startDate: fmt(addDays(today, 8)),
      endDate: fmt(addDays(today, 22)),
      color: '#3b82f6',
      rowId: 'row-3',
    },
    {
      id: 'task-4',
      title: 'Visual Design',
      description: 'Hi-fi mocks and design system',
      owner: 'Bob',
      startDate: fmt(addDays(today, 20)),
      endDate: fmt(addDays(today, 38)),
      color: '#ec4899',
      rowId: 'row-2',
    },
    {
      id: 'task-5',
      title: 'Frontend Build',
      description: 'Implement UI components',
      owner: 'Dave',
      startDate: fmt(addDays(today, 25)),
      endDate: fmt(addDays(today, 50)),
      color: '#10b981',
      rowId: 'row-3',
    },
    {
      id: 'task-6',
      title: 'Beta Launch',
      description: 'Limited rollout to early users',
      owner: 'Alice',
      startDate: fmt(addDays(today, 55)),
      endDate: fmt(addDays(today, 62)),
      color: '#f59e0b',
      rowId: 'row-1',
    },
  ]

  const dividers: Divider[] = [
    {
      id: 'div-1',
      date: fmt(addDays(today, 30)),
      label: 'Design Freeze',
      color: '#8b5cf6',
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

  // View / UI
  viewState: ViewState
  selectedTaskId: string | null
  sidePanelOpen: boolean
  darkMode: boolean

  // Undo / redo stacks (not persisted)
  past: Snapshot[]
  future: Snapshot[]

  // Internal
  _colorIndex: number

  // ---- Actions ----

  // View
  setViewState: (updates: Partial<ViewState>) => void
  selectTask: (id: string | null) => void
  setSidePanelOpen: (open: boolean) => void
  toggleDarkMode: () => void

  // Tasks
  addTask: (
    partial: Omit<Task, 'id' | 'color'> & { color?: string }
  ) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void

  // Rows
  addRow: (name?: string) => void
  updateRow: (id: string, updates: Partial<Row>) => void
  deleteRow: (id: string) => void
  moveRowUp: (id: string) => void
  moveRowDown: (id: string) => void

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
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------
const initial = makeInitialData()

export const useGanttStore = create<GanttStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tasks: initial.tasks,
      rows: initial.rows,
      dividers: initial.dividers,
      dependencies: initial.dependencies,
      viewState: getDefaultViewState('1q'),
      selectedTaskId: null,
      sidePanelOpen: false,
      darkMode: false,
      past: [],
      future: [],
      _colorIndex: initial.tasks.length,

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
        get()._pushHistory()
        const { _colorIndex } = get()
        const colors = [
          '#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
          '#ec4899', '#f97316', '#14b8a6', '#ef4444', '#84cc16',
        ]
        const color = partial.color ?? colors[_colorIndex % colors.length]
        const id = uuidv4()
        const task: Task = { ...partial, id, color, description: partial.description ?? '', owner: partial.owner ?? '' }
        set((s) => ({
          tasks: [...s.tasks, task],
          _colorIndex: s._colorIndex + (partial.color ? 0 : 1),
        }))
        return id
      },

      updateTask: (id, updates) => {
        get()._pushHistory()
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }))
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
      },

      // ---------------------------------------------------------------
      // Rows
      // ---------------------------------------------------------------
      addRow: (name) => {
        get()._pushHistory()
        const { rows } = get()
        const nextOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.order)) + 1 : 0
        const newRow: Row = {
          id: uuidv4(),
          name: name ?? `Lane ${nextOrder + 1}`,
          order: nextOrder,
        }
        set((s) => ({ rows: [...s.rows, newRow] }))
      },

      updateRow: (id, updates) => {
        get()._pushHistory()
        set((s) => ({
          rows: s.rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }))
      },

      deleteRow: (id) => {
        get()._pushHistory()
        set((s) => ({
          rows: s.rows.filter((r) => r.id !== id),
          tasks: s.tasks.filter((t) => t.rowId !== id),
        }))
      },

      moveRowUp: (id) => {
        get()._pushHistory()
        set((s) => {
          const sorted = [...s.rows].sort((a, b) => a.order - b.order)
          const idx = sorted.findIndex((r) => r.id === id)
          if (idx <= 0) return {}
          const rows = sorted.map((r, i) => {
            if (i === idx) return { ...r, order: sorted[idx - 1].order }
            if (i === idx - 1) return { ...r, order: sorted[idx].order }
            return r
          })
          return { rows }
        })
      },

      moveRowDown: (id) => {
        get()._pushHistory()
        set((s) => {
          const sorted = [...s.rows].sort((a, b) => a.order - b.order)
          const idx = sorted.findIndex((r) => r.id === id)
          if (idx >= sorted.length - 1) return {}
          const rows = sorted.map((r, i) => {
            if (i === idx) return { ...r, order: sorted[idx + 1].order }
            if (i === idx + 1) return { ...r, order: sorted[idx].order }
            return r
          })
          return { rows }
        })
      },

      // ---------------------------------------------------------------
      // Dividers
      // ---------------------------------------------------------------
      addDivider: (d) => {
        get()._pushHistory()
        set((s) => ({
          dividers: [...s.dividers, { ...d, id: uuidv4() }],
        }))
      },

      updateDivider: (id, updates) => {
        get()._pushHistory()
        set((s) => ({
          dividers: s.dividers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }))
      },

      deleteDivider: (id) => {
        get()._pushHistory()
        set((s) => ({ dividers: s.dividers.filter((d) => d.id !== id) }))
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
      },

      deleteDependency: (id) => {
        get()._pushHistory()
        set((s) => ({
          dependencies: s.dependencies.filter((d) => d.id !== id),
        }))
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
    }),
    {
      name: 'mrgant-v1',
      // Only persist data + view — not UI state or history stacks
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
