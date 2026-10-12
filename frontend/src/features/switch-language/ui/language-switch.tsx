import { useI18n, type Lang } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/cn'

const LANGS: Lang[] = ['en', 'ru']

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t('common.language')} className="inline-flex rounded-xl border-2 bg-card p-0.5 text-xs font-extrabold">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cn('cursor-pointer rounded-lg px-2.5 py-1 uppercase', lang === l ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
