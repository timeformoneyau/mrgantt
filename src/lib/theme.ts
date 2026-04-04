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
  bg: '#000404',
  surface: '#1A1A1A',
  surfaceAlt: '#111111',
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  text: '#FBF9F3',
  textMuted: '#B0AEA5',
  inputBg: '#222222',
  inputBorder: 'rgba(255,255,255,0.12)',
  taskBorder: 'rgba(255,255,255,0.10)',
  ghostOpacity: 0.38,
  isDark: true,
}

export function useTheme(): Theme {
  const darkMode = useGanttStore((s) => s.darkMode)
  return darkMode ? darkTheme : lightTheme
}
