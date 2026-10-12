import type { ReactNode } from 'react'
import { SECTIONS, type Exam } from '@/shared/api'
import { formatPercent } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'

export function ExamCard({ exam, actions }: { exam: Exam; actions?: ReactNode }) {
  const { t, pick } = useI18n()
  const avg = exam.stats.avgScore
  const my = exam.myStats

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{pick(exam.titleRu, exam.titleEn)}</CardTitle>
        {pick(exam.descriptionRu, exam.descriptionEn) && (
          <p className="text-sm text-muted-foreground">{pick(exam.descriptionRu, exam.descriptionEn)}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge className="bg-primary-soft text-primary">{t('exam.tasks', { n: exam.tasksCount })}</Badge>
          {SECTIONS.filter((s) => exam.sections[s]).map((s) => (
            <Badge key={s}>
              {t(`section.${s}`)} · {exam.sections[s]}
            </Badge>
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t('exam.avg')}</span>
            <span className="font-semibold">{avg == null ? t('exam.avgNone') : formatPercent(avg)}</span>
          </div>
          <Progress value={avg ?? 0} label={t('exam.avg')} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('exam.attempts', { n: exam.stats.attemptsCount })}
            {my && my.attemptsCount > 0 && (
              <>
                {' · '}
                {t('exam.mine')}: {formatPercent(my.bestScore)} / {formatPercent(my.lastScore)}
              </>
            )}
          </p>
        </div>

        {actions && <div className="mt-auto pt-1">{actions}</div>}
      </CardContent>
    </Card>
  )
}
