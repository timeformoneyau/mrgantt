import {
  differenceInDays,
  addDays,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  endOfQuarter,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isSameMonth,
  isSameQuarter,
  isWithinInterval,
} from 'date-fns'

// Layout constants
export const LEFT_PANEL_WIDTH = 240
export const HEADER_HEIGHT = 64  // 2-row header: 32 + 32
export const ROW_HEIGHT = 52     // per sub-lane
export const TASK_HEIGHT = 36
export const TASK_TOP_OFFSET = 8

export function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

export function formatDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Convert a date to a pixel x position relative to the view start. */
export function dateToX(date: Date | string, startDate: Date | string, dayWidth: number): number {
  const d = typeof date === 'string' ? parseDate(date) : date
  const s = typeof startDate === 'string' ? parseDate(startDate) : startDate
  return differenceInDays(startOfDay(d), startOfDay(s)) * dayWidth
}

/** Convert a pixel x position to a date (snapped to day). */
export function xToDate(x: number, startDate: Date | string, dayWidth: number): Date {
  const s = typeof startDate === 'string' ? parseDate(startDate) : startDate
  const days = Math.round(x / dayWidth)
  return addDays(startOfDay(s), days)
}

/** Total pixel width of the timeline. */
export function getTotalWidth(startDate: string, endDate: string, dayWidth: number): number {
  return differenceInDays(parseDate(endDate), parseDate(startDate)) * dayWidth + dayWidth
}

export interface MonthGroup {
  date: Date
  label: string
  shortLabel: string
  x: number
  width: number
  isQuarterStart: boolean
}

export interface WeekColumn {
  date: Date         // Monday of the week
  label: string      // "Jan 6"
  x: number
  width: number
  isMonthBoundary: boolean
  isQuarterBoundary: boolean
}

export function getMonthGroups(startDate: string, endDate: string, dayWidth: number): MonthGroup[] {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const months = eachMonthOfInterval({ start, end })

  return months.map((monthStart) => {
    const nextMonth = addDays(startOfMonth(addDays(monthStart, 32)), 0)
    const effectiveStart = monthStart < start ? start : monthStart
    const effectiveEnd = nextMonth > end ? addDays(end, 1) : nextMonth

    const x = dateToX(effectiveStart, start, dayWidth)
    const endX = dateToX(effectiveEnd, start, dayWidth)

    return {
      date: monthStart,
      label: format(monthStart, 'MMMM yyyy'),
      shortLabel: format(monthStart, 'MMM'),
      x,
      width: endX - x,
      isQuarterStart: monthStart.getMonth() % 3 === 0,
    }
  })
}

export function getWeekColumns(startDate: string, endDate: string, dayWidth: number): WeekColumn[] {
  const start = parseDate(startDate)
  const end = parseDate(endDate)

  // Get all Mondays within range (expand slightly to catch partial weeks)
  const weeks = eachWeekOfInterval(
    { start: addDays(start, -7), end: addDays(end, 7) },
    { weekStartsOn: 1 }
  )

  const result: WeekColumn[] = []

  for (let i = 0; i < weeks.length; i++) {
    const weekStart = weeks[i]
    const weekEnd = addDays(weekStart, 7)

    // Clamp to view range
    const effectiveStart = weekStart < start ? start : weekStart
    const effectiveEnd = weekEnd > addDays(end, 1) ? addDays(end, 1) : weekEnd

    if (effectiveStart >= addDays(end, 1)) break

    const x = dateToX(effectiveStart, start, dayWidth)
    const endX = dateToX(effectiveEnd, start, dayWidth)
    if (endX <= 0) continue

    const prevWeek = i > 0 ? weeks[i - 1] : null
    const isMonthBoundary = !prevWeek || !isSameMonth(weekStart, prevWeek)
    const isQuarterBoundary = !prevWeek || !isSameQuarter(weekStart, prevWeek)

    result.push({
      date: weekStart,
      label: format(effectiveStart, 'MMM d'),
      x,
      width: endX - x,
      isMonthBoundary,
      isQuarterBoundary,
    })
  }

  return result
}

/** Get the default view state for a given zoom preset. */
export function getDefaultViewState(zoom: '1q' | '2q' = '1q') {
  const today = new Date()
  const qStart = startOfQuarter(today)
  const qEnd = endOfQuarter(today)

  if (zoom === '1q') {
    return {
      startDate: formatDate(qStart),
      endDate: formatDate(qEnd),
      dayWidth: 24,
      zoom: '1q' as const,
    }
  } else {
    const nextQEnd = endOfQuarter(addDays(qEnd, 1))
    return {
      startDate: formatDate(qStart),
      endDate: formatDate(nextQEnd),
      dayWidth: 12,
      zoom: '2q' as const,
    }
  }
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return isWithinInterval(parseDate(date), {
    start: parseDate(startDate),
    end: parseDate(endDate),
  })
}
