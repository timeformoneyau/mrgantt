export interface Task {
  id: string
  title: string
  description: string
  owner: string
  startDate: string // YYYY-MM-DD (inclusive)
  endDate: string   // YYYY-MM-DD (inclusive)
  color: string
  rowId: string
}

export interface Row {
  id: string
  name: string
  order: number
}

export interface Divider {
  id: string
  date: string  // YYYY-MM-DD
  label: string
  color: string
  style: 'solid' | 'dashed'
}

export interface Dependency {
  id: string
  fromTaskId: string // finish of this task
  toTaskId: string   // must start after fromTask finishes
}

export type ZoomLevel = '1q' | '2q' | 'custom'

export interface ViewState {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  zoom: ZoomLevel
  dayWidth: number
}

export interface Snapshot {
  tasks: Task[]
  rows: Row[]
  dividers: Divider[]
  dependencies: Dependency[]
}

export type DragType = 'move' | 'resize-left' | 'resize-right' | 'create'
