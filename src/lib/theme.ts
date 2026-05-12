import { useGanttStore } from '@/store/ganttStore'

export interface Theme {
  bg: string
  surface: string
  surfaceAlt: string
  border: string
  borderSubtle: string
  text: string
  textMuted: string
  inputBg: string
  inputBorder: string
  /** Border treatment for task bars — adapts tint direction per mode */
  taskBorder: string
  /** Ghost bar opacity for drag-to-create preview */
  ghostOpacity: number
  /** True when dark mode is active — for one-off conditional logic */
  isDark: boolean
}

export const lightTheme: Theme = {
  bg: '#FBF9F3',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAF7',
  border: '#E8E6DE',
  borderSubtle: '#F0EEE8',
  text: '#000404',
  textMuted: '#B0AEA5',
  inputBg: '#fff',
  inputBorder: '#E8E6DE',
  taskBorder: 'rgba(0,4,4,0.08)',
  ghostOpacity: 0.25,
  isDark: false,
}

export const darkTheme: Theme = {
  bg: '#0A0A09',
  surface: '#1C1C1B',
  surfaceAlt: '#141413',
  border: 'rgba(255,255,255,0.13)',
  borderSubtle: 'rgba(255,255,255,0.07)',
  text: '#FBF9F3',
  textMuted: '#B0AEA5',
  inputBg: '#242423',
  inputBorder: 'rgba(255,255,255,0.15)',
  taskBorder: 'rgba(255,255,255,0.10)',
  ghostOpacity: 0.38,
  isDark: true,
}

export function useTheme(): Theme {
  const darkMode = useGanttStore((s) => s.darkMode)
  return darkMode ? darkTheme : lightTheme
}
