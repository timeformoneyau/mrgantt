/** Tiimely brand palette — corporate and retail accents. */
export const TASK_COLORS = [
  '#084A3C', // Forest Green (dark)
  '#55F366', // Tiimely Green (brand primary)
  '#1FE7DC', // Teal (corporate accent)
  '#357762', // Dark Teal (gradient mid-point)
  '#75FAAB', // Minty Fresh (retail)
  '#81ECF5', // Sky Blue (retail)
  '#FCFE7F', // Sunshine (retail)
  '#000404', // Tiimely Black
  '#3A7D64', // Mid Forest
  '#B0AEA5', // Mid Gray
]

export const COLOR_SWATCHES = TASK_COLORS

let _colorIndex = 0

export function getNextColor(): string {
  const color = TASK_COLORS[_colorIndex % TASK_COLORS.length]
  _colorIndex++
  return color
}

export function resetColorIndex(index = 0): void {
  _colorIndex = index
}

export function lightenHex(hex: string, amount = 0.82): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `rgb(${lr}, ${lg}, ${lb})`
}

/** Returns whether white or Tiimely Black is more readable on a given background. */
export function getContrastColor(hex: string): 'white' | '#000404' {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.45 ? '#000404' : 'white'
}
