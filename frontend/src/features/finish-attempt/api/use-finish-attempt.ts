import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, unwrap, type Streak } from '@/shared/api'
import { streakUpdate } from '@/shared/lib/streak-update'
import { useAuth } from '@/entities/user'
import { clearTimer } from '@/entities/attempt'

export function useFinishAttempt(attemptId: number) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ durationSeconds }: { durationSeconds: number; redirectTo?: string }) =>
      unwrap(
        api.POST('/attempts/{attemptID}/finish', {
          params: { path: { attemptID: attemptId } },
          body: { durationSeconds },
        }),
      ),
    onSuccess: (result, { redirectTo }) => {
      clearTimer(attemptId)
      // The first lesson finished today extends the streak by one: queue the celebration for the screen that comes next.
      const before = qc.getQueryData<Streak>(['streak', user?.id])
      if (before && !before.doneToday) streakUpdate.show(before.current, before.current + 1)
      qc.setQueryData(['result', attemptId], result)
      qc.removeQueries({ queryKey: ['attempt', attemptId] })
      void qc.invalidateQueries({ queryKey: ['lessons'] })
      void qc.invalidateQueries({ queryKey: ['my-attempts'] })
      void qc.invalidateQueries({ queryKey: ['streak'] })
      navigate(redirectTo ?? `/attempts/${attemptId}/result`, { replace: true })
    },
  })
}
