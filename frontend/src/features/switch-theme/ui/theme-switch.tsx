import { Palette } from 'lucide-react'
import { useI18n } from '@/shared/lib/i18n'
import { THEMES, useTheme, type Theme } from '@/shared/lib/theme'

export function ThemeSwitch() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border-2 bg-card px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
      <Palette size={14} aria-hidden="true" />
      <span className="sr-only">{t('theme.label')}</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="cursor-pointer bg-transparent text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        {THEMES.map((th) => (
          <option key={th} value={th}>
            {t(`theme.${th}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
