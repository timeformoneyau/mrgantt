# mrgant — Timeline Builder

A fast, intuitive, desktop-first Gantt chart builder for short-to-mid-range planning (1–2 quarters). Frictionless task creation, direct timeline editing, and clean visual output.

---

## How it works

### Timeline model

The timeline is defined by a **view state**:

| Field | Description |
|-------|-------------|
| `startDate` | First day of the visible range (`YYYY-MM-DD`) |
| `endDate` | Last day of the visible range (`YYYY-MM-DD`) |
| `dayWidth` | Pixels per calendar day (drives zoom) |

Coordinate math is straightforward:
```
pixelX = differenceInDays(date, startDate) * dayWidth
date   = startDate + round(pixelX / dayWidth) days
```

The header renders **two rows**:
1. **Month row** — month names spanning their week columns
2. **Week row** — week start dates (Monday-anchored)

Grid line weights: week = subtle, month = medium, quarter = strong.

**Preset zooms:**
- **1 Quarter** — current quarter, 24 px/day (~2160 px wide)
- **2 Quarters** — current + next quarter, 12 px/day
- **Custom** — pick any date range; day-width is auto-calculated to fit ~1800 px

---

### Task model

```typescript
interface Task {
  id: string
  title: string
  description: string
  owner: string
  startDate: string   // YYYY-MM-DD, inclusive
  endDate: string     // YYYY-MM-DD, inclusive
  color: string       // hex
  rowId: string
}
```

**Dates are inclusive** — a task from `2025-01-01` to `2025-01-07` is 7 days wide on the chart.

**Color palette** — 10 curated planning-friendly colors rotate automatically. Users can override per-task via swatches or a full hex picker.

**Sub-lane stacking** — tasks in the same row that overlap in time are automatically placed in non-overlapping sub-lanes using a greedy interval algorithm (`lib/taskLayout.ts`). Row height expands to fit.

---

### Interaction model

| Action | Result |
|--------|--------|
| Click empty area in a row | Create 5-day task at that date |
| Drag across empty area | Create task spanning the dragged range |
| Drag task body | Move task (snapped to day) |
| Drag left/right handles | Resize task (snapped to day) |
| Double-click task title | Inline rename |
| Click task | Select → open side panel |
| Escape | Deselect |
| Ctrl+Z / Cmd+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |

All pointer interactions are implemented with native `pointerdown / pointermove / pointerup` events and `setPointerCapture` for reliable cross-device tracking.

---

### Dependency model

Only **finish-to-start** dependencies are supported in v1:

```typescript
interface Dependency {
  id: string
  fromTaskId: string  // "from" task must finish first
  toTaskId: string    // "to" task may then start
}
```

Dependencies are rendered as SVG cubic bezier curves connecting the **right edge** of the source task to the **left edge** of the target task. Arrows are lightweight and become highlighted when either connected task is selected.

There is no auto-scheduling engine — dependencies are purely visual annotations.

**Creating dependencies:** select a task → side panel → "Depends on" → "+ Add" → pick from the task list.

---

### Divider markers

Custom vertical markers can be placed at any date:

```typescript
interface Divider {
  id: string
  date: string      // YYYY-MM-DD
  label: string
  color: string     // hex
  style: 'solid' | 'dashed'
}
```

Added via **Toolbar → Marker**. Click a marker label to delete it.

---

### Local persistence

Everything is saved to `localStorage` under the key `mrgant-v1` using Zustand's `persist` middleware.

**What persists:** tasks, rows, dividers, dependencies, view state, color rotation index.

**What doesn't persist:** undo/redo stacks, ephemeral drag state, side panel open state.

The store uses `JSON.stringify` / `JSON.parse` snapshots for the undo/redo stacks, keeping up to 50 history entries in each direction.

---

## What's in v1

- [x] Desktop-first responsive layout
- [x] Smooth horizontal + vertical scrolling with sticky headers/panels
- [x] 1Q / 2Q / Custom zoom presets
- [x] Weekly columns, month/quarter boundary emphasis
- [x] Custom divider markers (date, label, color, style)
- [x] Rows/lanes — create, rename (double-click), reorder, delete
- [x] Auto-stacking sub-lanes for overlapping tasks
- [x] Click-to-create and drag-to-create tasks
- [x] Move and resize tasks directly on the chart
- [x] Double-click to inline-rename tasks
- [x] Side panel: full task editor (title, description, owner, dates, color, row, dependencies)
- [x] Rotating color palette with swatch overrides and custom hex picker
- [x] Finish-to-start dependency links with SVG bezier arrows
- [x] Today line (red vertical rule)
- [x] Undo / redo (50 levels, Ctrl+Z / Ctrl+Y)
- [x] Full localStorage persistence with auto-restore

---

## Recommended v2 features

**Power features**
- [ ] Task progress (%) — fill bar inside task block
- [ ] Milestones — diamond markers at a single date
- [ ] Baseline / original plan overlay
- [ ] Critical path highlight
- [ ] Drag-to-reorder rows

**Collaboration**
- [ ] Multi-user real-time sync (Yjs / Liveblocks)
- [ ] Comments on tasks
- [ ] Auth (GitHub OAuth)

**Import / Export**
- [ ] PNG/PDF export (html2canvas or Puppeteer)
- [ ] CSV import
- [ ] JSON export/import for portability

**UX polish**
- [ ] Mini-map / scrollbar overview
- [ ] Collapsible rows
- [ ] Task grouping / parent tasks
- [ ] Global search across tasks
- [ ] Keyboard-driven task creation (press `n` to add)
- [ ] Multi-select tasks

**Scale**
- [ ] Server persistence (Postgres + Prisma)
- [ ] Team workspaces
- [ ] Project switcher

---

## Running locally

```bash
npm install
npm run dev
# open http://localhost:3000
```
