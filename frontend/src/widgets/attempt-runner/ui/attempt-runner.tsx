import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useBlocker } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { StreakCelebration } from '@/shared/ui/streak-celebration'
import type { AttemptState } from '@/shared/api'
import { useAttempt, useElapsedTimer } from '@/entities/attempt'
import { TaskView } from '@/entities/task'
import { useSaveAnswer } from '@/features/answer-question'
import { useFinishAttempt } from '@/features/finish-attempt'

/** A wrongly answered training task comes back after the current ones, up to this many wrong tries in total. */
const MAX_FAILS = 3
/** A celebration every this many correct answers in a row. */
const STREAK_STEP = 5

const NOPE_COUNT = 8

type Retry = { fails: number; done: boolean }
type Progress = { pos: number; repeats: number[]; retries: [number, Retry][] }

// Where the user is in the session survives a page reload.
const progressKey = (attemptId: number) => `attempt-progress:${attemptId}`

function loadProgress(attemptId: number, taskIds: Set<number>, total: number): Progress | null {
  try {
    const p = JSON.parse(localStorage.getItem(progressKey(attemptId)) ?? 'null') as Progress | null
    if (!p || !Array.isArray(p.repeats) || !Array.isArray(p.retries)) return null
    const repeats = p.repeats.filter((id) => taskIds.has(id))
    if (!Number.isInteger(p.pos) || p.pos < 0 || p.pos >= total + repeats.length) return null
    return { pos: p.pos, repeats, retries: p.retries.filter(([id]) => taskIds.has(id)) }
  } catch {
    return null
  }
}

function saveProgress(attemptId: number, p: Progress) {
  try {
    localStorage.setItem(progressKey(attemptId), JSON.stringify(p))
  } catch {
    // storage unavailable: progress simply is not remembered
  }
}

function clearProgress(attemptId: number) {
  try {
    localStorage.removeItem(progressKey(attemptId))
  } catch {
    // ignore
  }
}

export function AttemptRunner({ attemptId }: { attemptId: number }) {
  const { data, isPending, error } = useAttempt(attemptId)
  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  if (data.attempt.status === 'completed') return <Navigate to={`/attempts/${attemptId}/result`} replace />
  return <Runner attemptId={attemptId} data={data} />
}

function Runner({ attemptId, data }: { attemptId: number; data: AttemptState }) {
  const { t, pick } = useI18n()
  const confirm = useConfirm()
  const { attempt, tasks } = data
  const total = tasks.length
  const isTraining = attempt.mode === 'training'

  const timer = useElapsedTimer(attemptId, true)
  const save = useSaveAnswer(attemptId, !isTraining)
  const finish = useFinishAttempt(attemptId)

  // Restored once, on mount: the saved position, or else the first question without an answer.
  const [restored] = useState(() => {
    const saved = loadProgress(attemptId, new Set(tasks.map((tk) => tk.id)), total)
    if (saved) return saved
    const answered = new Set(data.answers.map((a) => a.taskId))
    const firstOpen = tasks.findIndex((tk) => !answered.has(tk.id))
    return { pos: firstOpen === -1 ? Math.max(total - 1, 0) : firstOpen, repeats: [], retries: [] } as Progress
  })

  // Position in the queue: the exam's tasks in order, then repeats of mistaken ones (training only).
  const [pos, setPos] = useState(restored.pos)
  const [repeats, setRepeats] = useState<number[]>(restored.repeats)
  const [retries, setRetries] = useState<Map<number, Retry>>(() => new Map(restored.retries))
  // Choices that are picked but not yet submitted, per queue position.
  const [pending, setPending] = useState<Map<number, number>>(new Map())
  // Result of the current repeat (repeats are practice only: they are not saved and do not change the score).
  const [repeatCheck, setRepeatCheck] = useState<{ picked: number; correct: boolean } | null>(null)
  const streak = useRef(0)
  // Which "nope" message the current mistake gets.
  const [nopeIdx, setNopeIdx] = useState(0)
  const [celebrate, setCelebrate] = useState<number | null>(null)
  const stopCelebrating = useCallback(() => setCelebrate(null), [])

  useEffect(() => {
    saveProgress(attemptId, { pos, repeats, retries: [...retries] })
  }, [attemptId, pos, repeats, retries])

  const answers = useMemo(() => new Map(data.answers.map((a) => [a.taskId, a])), [data.answers])

  const queue = [...tasks.map((tk) => tk.id), ...repeats]
  const task = tasks.find((tk) => tk.id === queue[Math.min(pos, queue.length - 1)]) ?? tasks[0]
  const answer = answers.get(task.id)
  const answeredCount = answers.size
  const isRepeat = pos >= total
  const retry = retries.get(task.id)
  const isLast = pos === queue.length - 1

  // What has happened on this screen.
  const picked = pending.get(pos)
  const submitted = isRepeat ? repeatCheck !== null : answer !== undefined
  const wasCorrect = isRepeat ? repeatCheck?.correct : answer?.isCorrect
  const selectedIndex = isRepeat ? (repeatCheck?.picked ?? picked) : (picked ?? answer?.selectedIndex)
  const revealed = isTraining && submitted
  const locked = isTraining && submitted
  const canConfirm = !locked && picked !== undefined && (isTraining || picked !== answer?.selectedIndex)

  const afterResult = (correct: boolean) => {
    if (!isTraining) return
    if (correct) {
      streak.current += 1
      if (streak.current % STREAK_STEP === 0) setCelebrate(streak.current)
      if (retry) setRetries((m) => new Map(m).set(task.id, { ...retry, done: true }))
      return
    }
    streak.current = 0
    setNopeIdx(Math.floor(Math.random() * NOPE_COUNT))
    const fails = (retry?.fails ?? 0) + 1
    const done = fails >= MAX_FAILS
    setRetries((m) => new Map(m).set(task.id, { fails, done }))
    if (!done) setRepeats((r) => [...r, task.id])
  }

  const onSelect = (i: number) => {
    if (locked) return
    setPending((m) => new Map(m).set(pos, i))
  }

  const onConfirm = () => {
    if (picked === undefined) return
    if (isRepeat) {
      const correct = picked === answer?.correctIndex
      setRepeatCheck({ picked, correct })
      afterResult(correct)
      return
    }
    save.mutate(
      { taskId: task.id, selectedIndex: picked },
      {
        onSuccess: (a) => {
          setPending((m) => {
            const n = new Map(m)
            n.delete(pos)
            return n
          })
          afterResult(a.isCorrect === true)
        },
      },
    )
  }

  const go = (to: number) => {
    setPos(to)
    setRepeatCheck(null)
  }

  // Set while the session is being ended on purpose, so the navigation that follows is not blocked.
  const leaving = useRef(false)

  const endSession = async (redirectTo?: string) => {
    leaving.current = true
    try {
      // mutateAsync (not a per-call callback) because finishing navigates away and unmounts this component.
      await finish.mutateAsync({ durationSeconds: timer.getSeconds(), redirectTo })
      clearProgress(attemptId)
    } catch {
      leaving.current = false
      // shown through finish.isError below
    }
  }

  const onEnd = async () => {
    const unanswered = total - answeredCount
    const msg = unanswered > 0 ? t('run.confirm', { n: unanswered }) : t('run.confirmAll')
    if (!(await confirm({ message: msg, confirmLabel: t('run.endSession') }))) return
    await endSession()
  }

  // Leaving to another page ends the session, so ask first.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !leaving.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const { pathname, search, hash } = blocker.location
    void confirm({ message: t('run.leaveWarning'), confirmLabel: t('run.endSession'), destructive: true }).then((ok) => {
      if (ok) void endSession(pathname + search + hash)
      else blocker.reset()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state])

  // The mobile action bar is fixed to the bottom; a spacer of the same height keeps the content scrollable past it.
  const bar = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState(96)
  useEffect(() => {
    const el = bar.current
    if (!el) return
    const ro = new ResizeObserver(() => setBarHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const showExplanation = revealed && answer?.explanation
  const correctText = !wasCorrect && revealed && answer?.correctIndex != null ? task.options[answer.correctIndex] : null

  // Mobile has a single full-width button that never moves; what it does depends on where the learner is.
  type Action = { label: string; onClick: () => void; disabled?: boolean; loading?: boolean }
  const action: Action = (() => {
    const finishNow = { label: t('run.finish'), loading: finish.isPending, onClick: () => void onEnd() }
    const next = { label: isTraining ? t('run.continue') : t('run.next'), onClick: () => go(pos + 1) }
    const check = { label: isTraining ? t('run.checkAnswer') : t('run.confirmAnswer'), loading: save.isPending, onClick: onConfirm }
    if (isTraining) return !submitted ? { ...check, disabled: !canConfirm } : isLast ? finishNow : next
    return canConfirm ? check : isLast ? finishNow : next
  })()

  const feedbackBody =
    isTraining && submitted ? (
      <>
        <p className={cn('text-lg font-extrabold', wasCorrect ? 'text-success' : 'text-destructive')}>
          {wasCorrect ? t('run.correct') : t(`nope.${nopeIdx % NOPE_COUNT}` as TKey)}
        </p>
        {correctText && (
          <p className="mt-1 text-sm">
            <span className="font-medium">{t('result.correctAnswer')}: </span>
            <span lang="ru" translate="no">{correctText}</span>
          </p>
        )}
        {showExplanation && (
          <p className="mt-1 text-sm">
            <span className="font-medium">{t('run.explanation')}: </span>
            <span lang="ru" translate="no">{answer?.explanation}</span>
          </p>
        )}
      </>
    ) : null

  return (
    <div className="space-y-4">
      {celebrate !== null && <StreakCelebration streak={celebrate} onDone={stopCelebrating} />}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-extrabold">{pick(attempt.examTitleRu, attempt.examTitleEn)}</h1>
        <Badge className={cn(isTraining ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-destructive')}>
          {t(`mode.${attempt.mode}`)}
        </Badge>
        <div className="ml-auto flex items-center gap-1.5 tabular-nums text-muted-foreground" aria-label={t('run.timer')}>
          <Clock size={16} />
          {formatDuration(timer.seconds)}
        </div>
        <div className="flex gap-1 md:hidden">
          {!isTraining && pos > 0 && (
            <Button variant="ghost" size="icon" aria-label={t('run.prev')} onClick={() => go(pos - 1)}>
              <ChevronLeft size={20} />
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label={t('run.endSession')} disabled={finish.isPending} onClick={() => void onEnd()}>
            <X size={20} />
          </Button>
        </div>
      </div>

      <div>
        <Progress value={(answeredCount / total) * 100} label={t('run.answered', { a: answeredCount, n: total })} />
        <p className="mt-1 text-xs text-muted-foreground">{t('run.answered', { a: answeredCount, n: total })}</p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <p className="text-sm text-muted-foreground">
            {isRepeat ? t('run.repeat') : t('run.question', { i: pos + 1, n: total })} · {t(`section.${task.section}`)}
          </p>

          <TaskView
            key={`${pos}-${task.id}`}
            task={task}
            selectedIndex={selectedIndex}
            correctIndex={revealed ? answer?.correctIndex : undefined}
            disabled={save.isPending || locked}
            onSelect={onSelect}
          />

          {!locked && (
            <Button className="hidden md:inline-flex" loading={save.isPending} disabled={!canConfirm} onClick={onConfirm}>
              {isTraining ? t('run.checkAnswer') : t('run.confirmAnswer')}
            </Button>
          )}

          {save.isError && <ErrorMessage error={new Error(t('run.saveFailed'))} />}

          {feedbackBody && (
            <div role="status" className={cn('hidden rounded-2xl p-4 md:block', wasCorrect ? 'bg-success-soft' : 'bg-danger-soft')}>
              {feedbackBody}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="hidden items-center justify-between gap-2 md:flex">
        {/* Training moves strictly forward (mistakes come back at the end); an exam can be revisited freely. */}
        {!isTraining ? (
          <Button variant="outline" disabled={pos === 0} onClick={() => go(pos - 1)}>
            <ChevronLeft size={16} /> {t('run.prev')}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {!isLast && (
            <Button variant="outline" disabled={isTraining && !submitted} onClick={() => go(pos + 1)}>
              {t('run.next')} <ChevronRight size={16} />
            </Button>
          )}
          <Button variant={isLast && (!isTraining || submitted) ? 'default' : 'ghost'} disabled={finish.isPending} onClick={onEnd}>
            {finish.isPending ? t('run.finishing') : t('run.endSession')}
          </Button>
        </div>
      </div>
      {finish.isError && <ErrorMessage error={finish.error} />}

      <div aria-hidden="true" className="md:hidden" style={{ height: barHeight }} />
      <div
        ref={bar}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden',
          feedbackBody ? (wasCorrect ? 'bg-success-soft' : 'bg-danger-soft') : 'bg-card',
        )}
      >
        {feedbackBody && (
          <div role="status" className="sheet-up max-h-[45vh] overflow-y-auto px-4 pt-4">
            {feedbackBody}
          </div>
        )}
        <div className="px-4 pt-3">
          <Button
            className="h-12 w-full text-base"
            variant={isTraining && submitted && !wasCorrect ? 'destructive' : 'default'}
            loading={action.loading}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      </div>
    </div>
  )
}
