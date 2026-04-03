'use client'

import React from 'react'
import { format } from 'date-fns'
import { Divider, ViewState } from '@/types'
import { dateToX, parseDate } from '@/lib/timeline'
import { useGanttStore } from '@/store/ganttStore'

interface DividerLayerProps {
  dividers: Divider[]
  viewState: ViewState
  totalHeight: number
}

export function DividerLayer({ dividers, viewState, totalHeight }: DividerLayerProps) {
  const deleteDivider = useGanttStore((s) => s.deleteDivider)

  return (
    <>
      {dividers.map((div) => {
        const x = dateToX(div.date, viewState.startDate, viewState.dayWidth)
        if (x < 0 || x > 99999) return null

        return (
          <div
            key={div.id}
            style={{
              position: 'absolute',
              left: x,
              top: 0,
              height: totalHeight,
              width: 1,
              background: div.color || '#8b5cf6',
              opacity: 0.6,
              borderLeft: `1px ${div.style} ${div.color || '#8b5cf6'}`,
              pointerEvents: 'none',
              zIndex: 12,
            }}
          >
            {/* Label */}
            {div.label && (
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  background: div.color || '#8b5cf6',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                  pointerEvents: 'all',
                  cursor: 'pointer',
                  opacity: 0.9,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}
                title={`${div.label} — ${format(parseDate(div.date), 'MMM d, yyyy')} — Click to remove`}
                onClick={() => {
                  if (confirm(`Remove marker "${div.label}"?`)) deleteDivider(div.id)
                }}
              >
                {div.label}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
