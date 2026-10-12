import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, RotateCcw, Timer } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, unwrap, type Mode } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { ErrorMessage } from '@/shared/ui/states'
import { useAuth } from '@/entities/user'

function useStartAttempt(examId: number) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mode: Mode) =>
      unwrap(api.POST('/exams/{examID}/attempts', { params: { path: { examID: examId } }, body: { mode } })),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({ queryKey: ['my-attempts'] })
      navigate(`/attempts/${attempt.id}`)
    },
  })
}

/** Starts a fresh attempt of the same exam in the same mode (shown on the results page). */
export function RetryAttempt({ examId, mode }: { examId: number; mode: Mode }) {
  const { t } = useI18n()
  const start = useStartAttempt(examId)
  return (
    <div className="space-y-2">
      <Button loading={start.isPending} onClick={() => start.mutate(mode)}>
        <RotateCcw size={16} /> {t('result.retry')}
      </Button>
      {start.isError && <ErrorMessage error={start.error} />}
    </div>
  )
}

export function StartAttempt({ examId, disabled, compact }: { examId: number; disabled?: boolean; compact?: boolean }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const start = useStartAttempt(examId)

  if (!user) {
    return (
      <Button variant="outline" size={compact ? 'sm' : 'default'} className={compact ? '' : 'w-full'} onClick={() => navigate('/login', { state: { from: location.pathname } })}>
        {t('exam.loginToStart')}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <div className={compact ? 'flex gap-2' : 'grid grid-cols-2 gap-2'}>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          disabled={disabled || start.isPending}
          onClick={() => start.mutate('training')}
          title={t('exam.trainingHint')}
        >
          <BookOpen size={16} /> {t('exam.training')}
        </Button>
        <Button size={compact ? 'sm' : 'default'} disabled={disabled || start.isPending} onClick={() => start.mutate('exam')} title={t('exam.examHint')}>
          <Timer size={16} /> {t('exam.exam')}
        </Button>
      </div>
      {start.isError && <ErrorMessage error={start.error} />}
    </div>
  )
}
