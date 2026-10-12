import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Timer } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, unwrap, type Mode } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { ErrorMessage } from '@/shared/ui/states'
import { useAuth } from '@/entities/user'

export function StartAttempt({ examId, disabled }: { examId: number; disabled?: boolean }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const start = useMutation({
    mutationFn: (mode: Mode) =>
      unwrap(api.POST('/exams/{examID}/attempts', { params: { path: { examID: examId } }, body: { mode } })),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({ queryKey: ['my-attempts'] })
      navigate(`/attempts/${attempt.id}`)
    },
  })

  if (!user) {
    return (
      <Button variant="outline" className="w-full" onClick={() => navigate('/login', { state: { from: location.pathname } })}>
        {t('exam.loginToStart')}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={disabled || start.isPending}
          onClick={() => start.mutate('training')}
          title={t('exam.trainingHint')}
        >
          <BookOpen size={16} /> {t('exam.training')}
        </Button>
        <Button disabled={disabled || start.isPending} onClick={() => start.mutate('exam')} title={t('exam.examHint')}>
          <Timer size={16} /> {t('exam.exam')}
        </Button>
      </div>
      {start.isError && <ErrorMessage error={start.error} />}
    </div>
  )
}
