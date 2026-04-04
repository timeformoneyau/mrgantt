'use client'

import React, { useState } from 'react'
import { COLOR_SWATCHES } from '@/lib/colors'
import { useTheme } from '@/lib/theme'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  compact?: boolean
}

export function ColorPicker({ value, onChange, compact = false }: ColorPickerProps) {
  const [showFull, setShowFull] = useState(false)
  const theme = useTheme()
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
              // Selection ring: use theme.text for the border (black in light, eggshell in dark)
              // and theme.surface for the inner gap outline
              border: value === color ? `2px solid ${theme.text}` : `1px solid ${theme.taskBorder}`,
              background: color,
              cursor: 'pointer', padding: 0,
              outline: value === color ? `1.5px solid ${theme.surface}` : 'none',
              outlineOffset: '-4px',
              transition: 'transform 0.1s',
              boxShadow: theme.isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,4,4,0.12)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.18)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          />
        ))}
        {/* Custom colour button */}
        <button
          onClick={() => setShowFull((v) => !v)}
          title="Custom colour"
          style={{
            width: size, height: size, borderRadius: '50%',
            border: `1.5px dashed ${theme.textMuted}`,
            background: theme.surfaceAlt,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: theme.textMuted, padding: 0,
            transition: 'border-color 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = theme.text
            ;(e.currentTarget as HTMLElement).style.color = theme.text
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = theme.textMuted
            ;(e.currentTarget as HTMLElement).style.color = theme.textMuted
          }}
        >+</button>
      </div>

      {showFull && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color" value={value} onChange={(e) => onChange(e.target.value)}
            style={{
              width: 36, height: 30,
              border: `1px solid ${theme.inputBorder}`, borderRadius: 5,
              padding: 2, cursor: 'pointer',
              background: theme.inputBg,
            }}
          />
          <input
            type="text" value={value}
            onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value) }}
            style={{
              flex: 1, padding: '5px 8px',
              border: `1px solid ${theme.inputBorder}`, borderRadius: 5,
              fontSize: 11, fontFamily: "'Poppins', Arial, sans-serif",
              outline: 'none', color: theme.text, background: theme.inputBg,
            }}
          />
        </div>
      )}
    </div>
  )
}
