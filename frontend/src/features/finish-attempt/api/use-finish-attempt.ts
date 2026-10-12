import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, unwrap } from '@/shared/api'
import { clearTimer } from '@/entities/attempt'

export function useFinishAttempt(attemptId: number) {
  const qc = useQueryClient()
  const navigate = useNavigate()
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
      qc.setQueryData(['result', attemptId], result)
      qc.removeQueries({ queryKey: ['attempt', attemptId] })
      void qc.invalidateQueries({ queryKey: ['exams'] })
      void qc.invalidateQueries({ queryKey: ['my-attempts'] })
      void qc.invalidateQueries({ queryKey: ['streak'] })
      navigate(redirectTo ?? `/attempts/${attemptId}/result`, { replace: true })
    },
  })
}
