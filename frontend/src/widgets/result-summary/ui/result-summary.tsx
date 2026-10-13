import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatDuration, formatPercent } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useResult } from '@/entities/attempt'
import { RetryAttempt, StartAttempt } from '@/features/start-attempt'

export function ResultSummary({ attemptId }: { attemptId: number }) {
  const { t, pick } = useI18n()
  const { data, isPending, error } = useResult(attemptId)

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

  const { attempt, items } = data
  const letter = (i: number) => 'ABCDEFGH'[i]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{t('result.title')}</p>
        <h1 className="text-xl font-extrabold">{pick(attempt.examTitleRu, attempt.examTitleEn)}</h1>
      </div>

      <Card>
        <CardContent className="grid items-center gap-6 pt-5 sm:grid-cols-[auto_1fr_auto]">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">{t('result.score')}</p>
            <p className="text-5xl font-extrabold tabular-nums text-primary">{formatPercent(attempt.scorePercent)}</p>
            <p className="mt-1 text-sm">{t('result.correct', { c: attempt.correctCount ?? 0, t: attempt.totalCount ?? 0 })}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:max-w-sm">
            <div>
              <dt className="text-muted-foreground">{t('result.time')}</dt>
              <dd className="text-lg font-extrabold tabular-nums">{formatDuration(attempt.durationSeconds ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('result.mode')}</dt>
              <dd className="text-lg font-extrabold">{t(`mode.${attempt.mode}`)}</dd>
            </div>
          </dl>
          {/* Its own full-width row, split evenly between the two buttons. */}
          <div className="grid grid-cols-2 items-start gap-2 sm:col-span-full">
            <RetryAttempt examId={attempt.examId} mode={attempt.mode} className="w-full whitespace-nowrap px-2 max-sm:text-xs sm:px-5" />
            <Button variant="outline" className="w-full whitespace-nowrap px-2 max-sm:text-xs sm:px-5" asChild>
              <Link to="/">{t('result.toExams')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">{t('result.review')}</h2>
        {items.map((it, n) => {
          const correctIdx = it.task.correctIndex
          const expl = it.task.explanation
          return (
            <Card key={it.task.id} className={cn('border-l-4', it.isCorrect ? 'border-l-success' : 'border-l-destructive')}>
              <CardContent className="space-y-2 pt-5 text-sm">
                <div className="flex items-start gap-2">
                  <Badge>{n + 1}</Badge>
                  <p lang="ru" translate="no" className="font-medium">{it.task.prompt}</p>
                </div>
                <p>
                  <span className="text-muted-foreground">{t('result.yourAnswer')}: </span>
                  <span lang="ru" translate="no" className={cn('font-medium', it.isCorrect ? 'text-success' : 'text-destructive')}>
                    {it.selectedIndex == null ? t('result.noAnswer') : `${letter(it.selectedIndex)}. ${it.task.options[it.selectedIndex]}`}
                  </span>
                </p>
                {!it.isCorrect && correctIdx != null && (
                  <p>
                    <span className="text-muted-foreground">{t('result.correctAnswer')}: </span>
                    <span lang="ru" translate="no" className="font-medium text-success">
                      {letter(correctIdx)}. {it.task.options[correctIdx]}
                    </span>
                  </p>
                )}
                {expl && <p lang="ru" translate="no" className="text-muted-foreground">{expl}</p>}
              </CardContent>
            </Card>
          )
        })}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <StartAttempt examId={attempt.examId} />
        </div>
        <Button variant="ghost" asChild>
          <Link to="/">{t('result.backHome')}</Link>
        </Button>
      </div>
    </div>
  )
}
