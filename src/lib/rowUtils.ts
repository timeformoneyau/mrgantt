import { Row } from '@/types'

/** Returns all rows in render order, respecting group collapse state.
 *  Groups first (by order), then their visible children (by order), then ungrouped legacy lanes, then system rows last. */
export function sortedVisibleRows(rows: Row[]): Row[] {
  const groups = rows.filter(r => r.type === 'group').sort((a, b) => a.order - b.order)
  const systemRows = rows.filter(r => r.type === 'system' || (r.isSystem && r.type !== 'group' && r.type !== 'lane'))
  const result: Row[] = []

  for (const group of groups) {
    result.push(group)
    if (!group.collapsed) {
      const children = rows
        .filter(r => r.parentGroupId === group.id)
        .sort((a, b) => a.order - b.order)
      result.push(...children)
    }
  }

  // Legacy ungrouped lanes (no type, no isSystem) — backwards compat
  const legacy = rows
    .filter(r => !r.type && !r.isSystem)
    .sort((a, b) => a.order - b.order)
  result.push(...legacy)

  result.push(...systemRows)
  return result
}

export function isGroupRow(row: Row): boolean {
  return row.type === 'group'
}

export function isLaneRow(row: Row): boolean {
  return row.type === 'lane' || (!row.type && !row.isSystem)
}

export function isSystemRow(row: Row): boolean {
  return row.type === 'system' || (!!row.isSystem && row.type !== 'group' && row.type !== 'lane')
}
