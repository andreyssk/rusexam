import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type ExamInput, type TaskInput } from '@/shared/api'

export function useAdminTasks(examId: number) {
  return useQuery({
    queryKey: ['admin-tasks', examId],
    queryFn: () => unwrap(api.GET('/admin/exams/{examID}/tasks', { params: { path: { examID: examId } } })),
  })
}

function useRefresh() {
  const qc = useQueryClient()
  return (examId?: number) => {
    void qc.invalidateQueries({ queryKey: ['exams'] })
    if (examId) {
      void qc.invalidateQueries({ queryKey: ['exam', examId] })
      void qc.invalidateQueries({ queryKey: ['admin-tasks', examId] })
    }
  }
}

export function useCreateExam() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (body: ExamInput) => unwrap(api.POST('/admin/exams', { body })),
    onSuccess: () => refresh(),
  })
}

export function useUpdateExam(examId: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (body: ExamInput) =>
      unwrap(api.PUT('/admin/exams/{examID}', { params: { path: { examID: examId } }, body })),
    onSuccess: () => refresh(examId),
  })
}

export function useDeleteExam() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (examId: number) =>
      unwrap(api.DELETE('/admin/exams/{examID}', { params: { path: { examID: examId } } })),
    onSuccess: () => refresh(),
  })
}

export function useCreateTask(examId: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (body: TaskInput) =>
      unwrap(api.POST('/admin/exams/{examID}/tasks', { params: { path: { examID: examId } }, body })),
    onSuccess: () => refresh(examId),
  })
}

export function useUpdateTask(examId: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TaskInput }) =>
      unwrap(api.PUT('/admin/tasks/{taskID}', { params: { path: { taskID: id } }, body })),
    onSuccess: () => refresh(examId),
  })
}

export function useDeleteTask(examId: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (taskId: number) =>
      unwrap(api.DELETE('/admin/tasks/{taskID}', { params: { path: { taskID: taskId } } })),
    onSuccess: () => refresh(examId),
  })
}
