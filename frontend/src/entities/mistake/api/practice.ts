import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, unwrap } from '@/shared/api'

/** Starts a work-on-mistakes lesson (tasks picked from the learner's mistakes) and opens it. Fails while there are too few mistakes. */
export function useStartMistakesPractice() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(api.POST('/me/mistakes/practice')),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({ queryKey: ['my-attempts'] })
      navigate(`/attempts/${attempt.id}`)
    },
  })
}
