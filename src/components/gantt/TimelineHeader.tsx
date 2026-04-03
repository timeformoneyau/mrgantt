'use client'

import React from 'react'
import { getMonthGroups, getWeekColumns, LEFT_PANEL_WIDTH } from '@/lib/timeline'
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
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      display: 'flex',
      background: '#FFFFFF',
      borderBottom: '1px solid #E8E6DE',
      flexShrink: 0,
    }}>
      {/* Corner */}
      <div style={{
        width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH,
        flexShrink: 0,
        position: 'sticky', left: 0, zIndex: 31,
        background: '#FFFFFF',
        borderRight: '1px solid #E8E6DE',
        display: 'flex', alignItems: 'flex-end',
        padding: '0 16px 7px',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700,
          letterSpacing: '0.1em', color: '#B0AEA5',
          textTransform: 'uppercase',
          fontFamily: "'Poppins', Arial, sans-serif",
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
        <div style={{ position: 'relative', height: 30, borderBottom: '1px solid #F0EEE8' }}>
          {months.map((m) => (
            <div key={m.date.toISOString()} style={{
              position: 'absolute', left: m.x, width: m.width,
              top: 0, height: 30,
              display: 'flex', alignItems: 'center', paddingLeft: 10,
              borderLeft: m.isQuarterStart
                ? '2px solid rgba(85,243,102,0.6)'
                : '1px solid #E8E6DE',
              overflow: 'hidden',
            }}>
              <span style={{
                fontSize: m.width > 100 ? 11 : 9,
                fontWeight: 700,
                fontFamily: "'Poppins', Arial, sans-serif",
                color: m.isQuarterStart ? '#000404' : '#B0AEA5',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {m.width > 60 ? m.label : m.shortLabel}
              </span>
              {/* Quarter start indicator dot */}
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
                ? '1px solid #B0AEA5'
                : '1px solid #F0EEE8',
              overflow: 'hidden',
            }}>
              {w.width > 38 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 500,
                  fontFamily: "'Poppins', Arial, sans-serif",
                  color: '#B0AEA5',
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
