'use client'

import React from 'react'
import { getMonthGroups, getWeekColumns, LEFT_PANEL_WIDTH } from '@/lib/timeline'
import { ViewState } from '@/types'
import { useTheme } from '@/lib/theme'

interface TimelineHeaderProps {
  viewState: ViewState
  totalWidth: number
}

export function TimelineHeader({ viewState, totalWidth }: TimelineHeaderProps) {
  const { startDate, endDate, dayWidth } = viewState
  const months = getMonthGroups(startDate, endDate, dayWidth)
  const weeks = getWeekColumns(startDate, endDate, dayWidth)
  const theme = useTheme()

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      display: 'flex',
      background: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      flexShrink: 0,
    }}>
      {/* Corner */}
      <div style={{
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        flexShrink: 0,
        position: 'sticky', left: 0, zIndex: 31,
        background: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'flex-end',
        padding: '0 16px 7px',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.1em', color: theme.textMuted,
          textTransform: 'uppercase',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}>
          LANES
        </span>
      </div>

      {/* Timeline columns */}
      <div style={{
        position: 'relative', width: totalWidth, minWidth: totalWidth,
        flexShrink: 0, display: 'flex', flexDirection: 'column',
      }}>
        {/* Month row */}
        <div style={{ position: 'relative', height: 30, borderBottom: `1px solid ${theme.borderSubtle}` }}>
          {months.map((m) => (
            <div key={m.date.toISOString()} style={{
              position: 'absolute', left: m.x, width: m.width,
              top: 0, height: 30,
              display: 'flex', alignItems: 'center', paddingLeft: 10,
              borderLeft: m.isQuarterStart
                ? '2px solid rgba(85,243,102,0.6)'
                : `1px solid ${theme.border}`,
              overflow: 'hidden',
            }}>
              <span style={{
                fontSize: m.width > 100 ? 13 : 11,
                fontWeight: 700,
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                color: m.isQuarterStart ? theme.text : theme.textMuted,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {m.width > 60 ? m.label : m.shortLabel}
              </span>
              {m.isQuarterStart && (
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#55F366', marginLeft: 6, flexShrink: 0,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Week row */}
        <div style={{ position: 'relative', height: 30 }}>
          {weeks.map((w) => (
            <div key={w.date.toISOString()} style={{
              position: 'absolute', left: w.x, width: w.width,
              top: 0, height: 30,
              display: 'flex', alignItems: 'center', paddingLeft: 6,
              borderLeft: w.isQuarterBoundary
                ? '2px solid rgba(85,243,102,0.5)'
                : w.isMonthBoundary
                ? `1px solid ${theme.textMuted}`
                : `1px solid ${theme.borderSubtle}`,
              overflow: 'hidden',
            }}>
              {w.width > 38 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  color: theme.textMuted,
                  whiteSpace: 'nowrap',
                }}>
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
