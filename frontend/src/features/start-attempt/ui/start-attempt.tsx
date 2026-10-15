import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, RotateCcw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, unwrap, type Mode } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { LoadingSplash } from '@/shared/ui/splash'
import { ErrorMessage } from '@/shared/ui/states'
import { useStartMistakesPractice } from '@/entities/mistake'
import { useAuth } from '@/entities/user'

function useStartAttempt(lessonId: number) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mode: Mode) =>
      unwrap(api.POST('/lessons/{lessonID}/attempts', { params: { path: { lessonID: lessonId } }, body: { mode } })),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({ queryKey: ['my-attempts'] })
      navigate(`/attempts/${attempt.id}`)
    },
  })
}

/**
 * Starts a fresh attempt like the one on the results page: the same lesson in the same mode, or, for a work-on-mistakes
 * lesson (no lesson id), a new set of tasks picked from the learner's mistakes.
 */
export function RetryAttempt({ lessonId, mode, className }: { lessonId: number | null; mode: Mode; className?: string }) {
  const { t } = useI18n()
  const lesson = useStartAttempt(lessonId ?? 0)
  const mistakes = useStartMistakesPractice()
  const start = lessonId == null ? mistakes : lesson
  return (
    <div className="space-y-2">
      <Button className={className} loading={start.isPending} onClick={() => (lessonId == null ? mistakes.mutate() : lesson.mutate(mode))}>
        <RotateCcw size={16} className="shrink-0 max-[400px]:hidden" /> {t('result.retry')}
      </Button>
      {start.isError && <ErrorMessage error={start.error} />}
    </div>
  )
}

/** Starts practicing a lesson: just a play icon, for the right-hand side of a lesson row. */
export function StartAttempt({ lessonId, disabled }: { lessonId: number; disabled?: boolean }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const start = useStartAttempt(lessonId)

  // Visitors are sent to log in first; the icon looks and sits the same.
  const label = user ? t('lesson.training') : t('lesson.loginToStart')
  return (
    <div className="space-y-2">
      <Button
        size="icon"
        className="size-11"
        disabled={user ? disabled || start.isPending : false}
        onClick={() => (user ? start.mutate('training') : navigate('/login', { state: { from: location.pathname } }))}
        aria-label={label}
      >
        {/* While starting: the spinner replaces the play icon on desktop; phones show the splash screen instead. */}
        <Play size={20} fill="currentColor" className={start.isPending ? 'md:hidden' : undefined} />
        {start.isPending && <Spinner size={20} className="max-md:hidden" />}
      </Button>
      {start.isPending && <LoadingSplash className="md:hidden" />}
      {start.isError && <ErrorMessage error={start.error} />}
    </div>
  )
}
