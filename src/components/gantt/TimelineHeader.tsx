'use client'

import React from 'react'
import { format } from 'date-fns'
import { getMonthGroups, getWeekColumns, LEFT_PANEL_WIDTH, parseDate } from '@/lib/timeline'
import { ViewState } from '@/types'

interface TimelineHeaderProps {
  viewState: ViewState
  totalWidth: number
}

export function TimelineHeader({ viewState, totalWidth }: TimelineHeaderProps) {
  const { startDate, endDate, dayWidth } = viewState
  const months = getMonthGroups(startDate, endDate, dayWidth)
  const weeks = getWeekColumns(startDate, endDate, dayWidth)

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}
    >
      {/* Corner cell */}
      <div
        style={{
          width: LEFT_PANEL_WIDTH,
          minWidth: LEFT_PANEL_WIDTH,
          flexShrink: 0,
          position: 'sticky',
          left: 0,
          zIndex: 31,
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 16px 6px',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#9ca3af', textTransform: 'uppercase' }}>
          LANES
        </span>
      </div>

      {/* Timeline header columns */}
      <div
        style={{
          position: 'relative',
          width: totalWidth,
          minWidth: totalWidth,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Month row */}
        <div style={{ position: 'relative', height: 32, borderBottom: '1px solid #f3f4f6' }}>
          {months.map((m) => (
            <div
              key={m.date.toISOString()}
              style={{
                position: 'absolute',
                left: m.x,
                width: m.width,
                top: 0,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 10,
                borderLeft: m.isQuarterStart
                  ? '2px solid #9ca3af'
                  : '1px solid #e5e7eb',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: m.width > 80 ? 12 : 10,
                  fontWeight: 600,
                  color: m.isQuarterStart ? '#374151' : '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {m.width > 60 ? m.label : m.shortLabel}
              </span>
            </div>
          ))}
        </div>

        {/* Week row */}
        <div style={{ position: 'relative', height: 32 }}>
          {weeks.map((w) => (
            <div
              key={w.date.toISOString()}
              style={{
                position: 'absolute',
                left: w.x,
                width: w.width,
                top: 0,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 6,
                borderLeft: w.isQuarterBoundary
                  ? '2px solid #9ca3af'
                  : w.isMonthBoundary
                  ? '1px solid #d1d5db'
                  : '1px solid #f3f4f6',
                overflow: 'hidden',
              }}
            >
              {w.width > 40 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#9ca3af',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {w.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
