import type { ReactNode } from 'react'
import type { Lesson } from '@/shared/api'
import { formatPercent } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Progress, ProgressRing } from '@/shared/ui/progress'

export function LessonRow({ lesson, actions }: { lesson: Lesson; actions?: ReactNode }) {
  const { t, pick } = useI18n()
  const my = lesson.myStats
  const last = my?.lastScore

  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 border-b-4 bg-card px-3 py-2.5 md:gap-5">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-extrabold leading-snug md:text-base">{pick(lesson.titleRu, lesson.titleEn)}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t('lesson.tasks', { n: lesson.tasksCount })}
            {my && my.attemptsCount > 0 && <> · {t('lesson.myAttempts', { n: my.attemptsCount })}</>}
          </span>
        </p>
      </div>

      {/* Personal result: empty for visitors who are not logged in or have not finished this lesson yet. */}
      <ProgressRing size={52} className="shrink-0 md:hidden" value={last ?? null} label={t('lesson.last')} text={last == null ? '—' : formatPercent(last)} />
      <div className="hidden w-36 shrink-0 md:block">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{t('lesson.last')}</span>
          <span className="font-extrabold tabular-nums">{last == null ? '—' : formatPercent(last)}</span>
        </div>
        <Progress value={last ?? 0} label={t('lesson.last')} />
      </div>

      {/* The action (a play icon) sits at the right end of the row. */}
      {actions && <div className="shrink-0">{actions}</div>}
    </li>
  )
}
