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
}

export function useTheme(): Theme {
  const darkMode = useGanttStore((s) => s.darkMode)
  return darkMode ? darkTheme : lightTheme
}
