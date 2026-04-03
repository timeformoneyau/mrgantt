'use client'

import React, { useState } from 'react'
import { COLOR_SWATCHES } from '@/lib/colors'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  compact?: boolean
}

export function ColorPicker({ value, onChange, compact = false }: ColorPickerProps) {
  const [showFull, setShowFull] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      {/* Swatch grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 5 : 7 }}>
        {COLOR_SWATCHES.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            title={color}
            style={{
              width: compact ? 20 : 24,
              height: compact ? 20 : 24,
              borderRadius: '50%',
              border: value === color ? '2.5px solid #111827' : '2px solid transparent',
              background: color,
              cursor: 'pointer',
              outline: value === color ? '1.5px solid white' : 'none',
              outlineOffset: '-4px',
              padding: 0,
              transition: 'transform 0.1s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          />
        ))}
        {/* Custom color trigger */}
        <button
          onClick={() => setShowFull((v) => !v)}
          title="Custom color"
          style={{
            width: compact ? 20 : 24,
            height: compact ? 20 : 24,
            borderRadius: '50%',
            border: '2px dashed #d1d5db',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            fontSize: compact ? 11 : 13,
            color: '#9ca3af',
          }}
        >
          +
        </button>
      </div>

      {/* Full color input */}
      {showFull && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 40, height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: 2, cursor: 'pointer' }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
            }}
            style={{
              flex: 1,
              padding: '5px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}
