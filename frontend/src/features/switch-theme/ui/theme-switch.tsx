import { ChevronDown, Palette } from 'lucide-react'
import { useI18n } from '@/shared/lib/i18n'
import { THEMES, useTheme, type Theme } from '@/shared/lib/theme'

export function ThemeSwitch() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  return (
    // The select fills the whole control, so a click anywhere on it opens the list.
    <div className="relative">
      <Palette size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <select
        aria-label={t('theme.label')}
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="h-9 w-full cursor-pointer appearance-none rounded-xl border-2 bg-card py-1.5 pl-8 pr-8 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {THEMES.map((th) => (
          <option key={th} value={th}>
            {t(`theme.${th}`)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
