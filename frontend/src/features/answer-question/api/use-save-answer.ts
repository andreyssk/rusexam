import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type AnswerState, type AttemptState } from '@/shared/api'

function upsertAnswer(old: AttemptState | undefined, answer: AnswerState): AttemptState | undefined {
  if (!old) return old
  return { ...old, answers: [...old.answers.filter((a) => a.taskId !== answer.taskId), answer] }
}

/**
 * Saves an answer. With `optimistic` (exam mode, where answers stay editable and carry no feedback)
 * the selection shows instantly and is rolled back by a refetch if saving fails.
 */
export function useSaveAnswer(attemptId: number, optimistic: boolean) {
  const qc = useQueryClient()
  const key = ['attempt', attemptId]
  return useMutation({
    mutationFn: ({ taskId, selectedIndex }: { taskId: number; selectedIndex: number }) =>
      unwrap(
        api.PUT('/attempts/{attemptID}/answers/{taskID}', {
          params: { path: { attemptID: attemptId, taskID: taskId } },
          body: { selectedIndex },
        }),
      ),
    onMutate: (v) => {
      if (optimistic) qc.setQueryData<AttemptState>(key, (old) => upsertAnswer(old, v))
    },
    onSuccess: (answer) => {
      qc.setQueryData<AttemptState>(key, (old) => upsertAnswer(old, answer))
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: key })
    },
  })
}
