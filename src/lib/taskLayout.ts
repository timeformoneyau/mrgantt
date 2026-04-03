import { Task } from '@/types'
import { parseDate } from './timeline'

export interface LayoutTask {
  task: Task
  subLane: number
}

/**
 * Assigns tasks in a row to non-overlapping sub-lanes using a greedy interval approach.
 * Tasks are sorted by start date, then assigned to the first available lane.
 */
export function computeTaskLayout(tasks: Task[]): LayoutTask[] {
  if (tasks.length === 0) return []

  const sorted = [...tasks].sort((a, b) => {
    const diff = parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
    if (diff !== 0) return diff
    // Secondary sort by id for stability
    return a.id.localeCompare(b.id)
  })

  const result: LayoutTask[] = []
  // Track the end time of the last task assigned to each lane
  const laneEndTimes: number[] = []

  for (const task of sorted) {
    const startMs = parseDate(task.startDate).getTime()
    // endDate is inclusive, so lane is free from the next day onward
    const endMs = parseDate(task.endDate).getTime()

    let assigned = false
    for (let lane = 0; lane < laneEndTimes.length; lane++) {
      if (laneEndTimes[lane] < startMs) {
        result.push({ task, subLane: lane })
        laneEndTimes[lane] = endMs
        assigned = true
        break
      }
    }

    if (!assigned) {
      const newLane = laneEndTimes.length
      result.push({ task, subLane: newLane })
      laneEndTimes.push(endMs)
    }
  }

  return result
}

/** Returns the number of sub-lanes needed for a set of tasks. */
export function getSubLaneCount(tasks: Task[]): number {
  if (tasks.length === 0) return 1
  const layout = computeTaskLayout(tasks)
  return Math.max(1, ...layout.map((lt) => lt.subLane + 1))
}

/** Returns the row height in pixels given a task count for that row. */
export function getRowHeight(tasks: Task[]): number {
  const { ROW_HEIGHT } = { ROW_HEIGHT: 52 }
  return getSubLaneCount(tasks) * ROW_HEIGHT
}
