import { ChevronLeft, ChevronRight, Clock, Languages } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useAttempt, useElapsedTimer } from '@/entities/attempt'
import { TaskView } from '@/entities/task'
import { useSaveAnswer } from '@/features/answer-question'
import { useFinishAttempt } from '@/features/finish-attempt'

export function AttemptRunner({ attemptId }: { attemptId: number }) {
  const { t, lang, pick } = useI18n()
  const { data, isPending, error } = useAttempt(attemptId)
  const completed = data?.attempt.status === 'completed'
  const isTraining = data?.attempt.mode === 'training'

  const timer = useElapsedTimer(attemptId, !!data && !completed)
  const save = useSaveAnswer(attemptId, !isTraining)
  const finish = useFinishAttempt(attemptId)

  const [index, setIndex] = useState(0)
  const [translateOverride, setTranslateOverride] = useState<boolean | null>(null)

  const answers = useMemo(() => new Map((data?.answers ?? []).map((a) => [a.taskId, a])), [data?.answers])

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  if (completed) return <Navigate to={`/attempts/${attemptId}/result`} replace />

  const { attempt, tasks } = data
  const total = tasks.length
  const task = tasks[Math.min(index, total - 1)]
  const answer = answers.get(task.id)
  const answeredCount = answers.size
  const showTranslation = translateOverride ?? (lang === 'en' && isTraining)
  const feedbackShown = isTraining && answer?.isCorrect !== undefined
  const isLast = index === total - 1

  const onSelect = (i: number) => {
    if (isTraining && answer) return
    if (!isTraining && answer?.selectedIndex === i) return
    save.mutate({ taskId: task.id, selectedIndex: i })
  }

  const onFinish = () => {
    const unanswered = total - answeredCount
    const msg = unanswered > 0 ? t('run.confirm', { n: unanswered }) : t('run.confirmAll')
    if (window.confirm(msg)) finish.mutate(timer.getSeconds())
  }

  const explanation = answer ? pick(answer.explanationRu, answer.explanationEn) : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-extrabold">{pick(attempt.examTitleRu, attempt.examTitleEn)}</h1>
        <Badge className={cn(isTraining ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-destructive')}>
          {t(`mode.${attempt.mode}`)}
        </Badge>
        <div className="ml-auto flex items-center gap-1.5 tabular-nums text-muted-foreground" aria-label={t('run.timer')}>
          <Clock size={16} />
          {formatDuration(timer.seconds)}
        </div>
      </div>

      <div>
        <Progress value={(answeredCount / total) * 100} label={t('run.answered', { a: answeredCount, n: total })} />
        <p className="mt-1 text-xs text-muted-foreground">{t('run.answered', { a: answeredCount, n: total })}</p>
      </div>

      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {tasks.map((tk, i) => {
          const a = answers.get(tk.id)
          return (
            <button
              key={tk.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? 'step' : undefined}
              className={cn(
                'h-9 w-9 cursor-pointer rounded-xl border-2 border-b-4 bg-card text-sm font-extrabold text-muted-foreground',
                a && 'border-accent bg-accent-soft text-accent',
                a?.isCorrect === true && 'border-success bg-success-soft text-success',
                a?.isCorrect === false && 'border-destructive bg-danger-soft text-destructive',
                i === index && 'outline-2 outline-offset-2 outline-accent',
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </nav>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {t('run.question', { i: index + 1, n: total })} · {t(`section.${task.section}`)}
            </p>
            <Button
              variant="outline"
              className={showTranslation ? 'bg-accent-soft' : undefined}
              size="sm"
              aria-pressed={showTranslation}
              onClick={() => setTranslateOverride(!showTranslation)}
            >
              <Languages size={14} /> {t('run.translation')}
            </Button>
          </div>

          <TaskView
            key={task.id}
            task={task}
            selectedIndex={answer?.selectedIndex}
            correctIndex={feedbackShown ? answer?.correctIndex : undefined}
            disabled={save.isPending || (isTraining && !!answer)}
            showTranslation={showTranslation}
            onSelect={onSelect}
          />

          {save.isError && <ErrorMessage error={new Error(t('run.saveFailed'))} />}

          {feedbackShown && (
            <div
              role="status"
              className={cn('rounded-2xl p-4', answer?.isCorrect ? 'bg-success-soft' : 'bg-danger-soft')}
            >
              <p className={cn('text-lg font-extrabold', answer?.isCorrect ? 'text-success' : 'text-destructive')}>
                {answer?.isCorrect ? t('run.correct') : t('run.wrong')}
              </p>
              {explanation && (
                <p className="mt-1 text-sm">
                  <span className="font-medium">{t('run.explanation')}: </span>
                  {explanation}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ChevronLeft size={16} /> {t('run.prev')}
        </Button>
        <div className="flex gap-2">
          {!isLast && (
            <Button variant="outline" onClick={() => setIndex(index + 1)}>
              {t('run.next')} <ChevronRight size={16} />
            </Button>
          )}
          <Button variant={isLast ? 'default' : 'ghost'} disabled={finish.isPending} onClick={onFinish}>
            {finish.isPending ? t('run.finishing') : t('run.finish')}
          </Button>
        </div>
      </div>
      {finish.isError && <ErrorMessage error={finish.error} />}
    </div>
  )
}
