/** Curated planning-friendly palette — neither too corporate nor too playful. */
export const TASK_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#ef4444', // red
  '#84cc16', // lime
]

/** Quick-pick swatches shown in the inline picker (same palette). */
export const COLOR_SWATCHES = TASK_COLORS

let _colorIndex = 0

/** Returns the next color in the rotating palette. */
export function getNextColor(): string {
  const color = TASK_COLORS[_colorIndex % TASK_COLORS.length]
  _colorIndex++
  return color
}

/** Resets the color rotation (useful for deterministic testing). */
export function resetColorIndex(index = 0): void {
  _colorIndex = index
}

/** Returns a lighter version of a hex color for backgrounds. */
export function lightenHex(hex: string, amount = 0.82): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `rgb(${lr}, ${lg}, ${lb})`
}

/** Returns whether white or dark text is more readable on a given background color. */
export function getContrastColor(hex: string): 'white' | '#1f2937' {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1f2937' : 'white'
}
