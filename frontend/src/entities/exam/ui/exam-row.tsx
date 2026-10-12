import type { ReactNode } from 'react'
import type { Exam } from '@/shared/api'
import { formatPercent } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Progress, ProgressRing } from '@/shared/ui/progress'

export function ExamRow({ exam, actions }: { exam: Exam; actions?: ReactNode }) {
  const { t, pick } = useI18n()
  const my = exam.myStats
  const last = my?.lastScore

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-2xl border-2 border-b-4 bg-card px-3 py-2.5 md:flex md:flex-wrap md:gap-x-5">
      <div className="min-w-0 md:flex-1 md:basis-56">
        <h2 className="text-sm font-extrabold leading-snug md:text-base">{pick(exam.titleRu, exam.titleEn)}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge translate="no" className="bg-accent-soft text-accent">
            {t(`level.${exam.level}`)}
          </Badge>
          <span>
            {t('exam.tasks', { n: exam.tasksCount })}
            {my && my.attemptsCount > 0 && <> · {t('exam.myAttempts', { n: my.attemptsCount })}</>}
          </span>
        </p>
      </div>

      {/* Personal result: empty for visitors who are not logged in or have not finished this exam yet. */}
      <ProgressRing size={60} className="md:hidden" value={last ?? null} label={t('exam.last')} text={last == null ? '—' : formatPercent(last)} />
      <div className="hidden w-36 shrink-0 md:block">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{t('exam.last')}</span>
          <span className="font-extrabold tabular-nums">{last == null ? '—' : formatPercent(last)}</span>
        </div>
        <Progress value={last ?? 0} label={t('exam.last')} />
      </div>

      {actions && <div className="col-span-2 md:col-auto md:shrink-0">{actions}</div>}
    </li>
  )
}
