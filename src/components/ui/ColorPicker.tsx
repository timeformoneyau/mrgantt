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
  const size = compact ? 18 : 22

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 5 : 6, alignItems: 'center' }}>
        {COLOR_SWATCHES.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            title={color}
            style={{
              width: size, height: size, borderRadius: '50%',
              border: value === color ? '2px solid #000404' : '1px solid rgba(0,4,4,0.08)',
              background: color,
              cursor: 'pointer', padding: 0,
              outline: value === color ? '1.5px solid #FBF9F3' : 'none',
              outlineOffset: '-4px',
              transition: 'transform 0.1s',
              boxShadow: '0 1px 2px rgba(0,4,4,0.12)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.18)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          />
        ))}
        {/* Custom */}
        <button
          onClick={() => setShowFull((v) => !v)}
          title="Custom colour"
          style={{
            width: size, height: size, borderRadius: '50%',
            border: '1.5px dashed #B0AEA5', background: '#FBF9F3',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#B0AEA5', padding: 0,
            transition: 'border-color 0.1s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#000404' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#B0AEA5' }}
        >+</button>
      </div>

      {showFull && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color" value={value} onChange={(e) => onChange(e.target.value)}
            style={{ width: 36, height: 30, border: '1px solid #E8E6DE', borderRadius: 5, padding: 2, cursor: 'pointer' }}
          />
          <input
            type="text" value={value}
            onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value) }}
            style={{
              flex: 1, padding: '5px 8px', border: '1px solid #E8E6DE', borderRadius: 5,
              fontSize: 11, fontFamily: 'monospace', outline: 'none', color: '#000404',
            }}
          />
        </div>
      )}
    </div>
  )
}
