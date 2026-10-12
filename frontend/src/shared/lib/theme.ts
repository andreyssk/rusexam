import { useCallback, useState } from 'react'
import { safeStorage } from './storage'

export type Theme = 'auto' | 'light' | 'dark'
export const THEMES: Theme[] = ['auto', 'light', 'dark']

const KEY = 'rutest.theme'

function read(): Theme {
  const v = safeStorage.get(KEY)
  return v === 'light' || v === 'dark' ? v : 'auto'
}

function apply(theme: Theme) {
  if (theme === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(read)
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (t === 'auto') safeStorage.remove(KEY)
    else safeStorage.set(KEY, t)
    apply(t)
  }, [])
  return { theme, setTheme }
}
