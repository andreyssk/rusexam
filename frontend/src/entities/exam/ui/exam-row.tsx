import type { ReactNode } from 'react'
import type { Exam } from '@/shared/api'
import { formatPercent } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Progress } from '@/shared/ui/progress'

export function ExamRow({ exam, actions }: { exam: Exam; actions?: ReactNode }) {
  const { t, pick } = useI18n()
  const my = exam.myStats
  const last = my?.lastScore

  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border-2 border-b-4 bg-card px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <h2 className="truncate text-base font-extrabold leading-snug" title={pick(exam.titleRu, exam.titleEn)}>
          {pick(exam.titleRu, exam.titleEn)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t('exam.tasks', { n: exam.tasksCount })}
          {my && my.attemptsCount > 0 && <> · {t('exam.myAttempts', { n: my.attemptsCount })}</>}
        </p>
      </div>

      {/* Personal result: empty for visitors who are not logged in or have not finished this exam yet. */}
      <div className="w-36 shrink-0">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{t('exam.last')}</span>
          <span className="font-extrabold tabular-nums">{last == null ? '—' : formatPercent(last)}</span>
        </div>
        <Progress value={last ?? 0} label={t('exam.last')} />
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </li>
  )
}
