import { Moon, Sun } from 'lucide-react'
import { useI18n } from '@/shared/lib/i18n'
import { useTheme } from '@/shared/lib/theme'
import { Button } from '@/shared/ui/button'
import { Tooltip } from '@/shared/ui/tooltip'

export function ThemeSwitch() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  // "auto" follows the OS, so resolve it to what is actually shown before flipping.
  const isDark = theme === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark'
  const label = t('theme.label')
  return (
    <Tooltip label={label}>
      <Button variant="outline" size="icon" aria-label={label} onClick={() => setTheme(isDark ? 'light' : 'dark')}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </Button>
    </Tooltip>
  )
}
