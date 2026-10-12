import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type ExamInput } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

function useExamMutationHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => {
      void qc.invalidateQueries({ queryKey: ['exams'] })
      void qc.invalidateQueries({ queryKey: ['exam'] })
    },
    ok: (key: Parameters<typeof t>[0]) => toast.success(t(key)),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

export function useCreateExam() {
  const h = useExamMutationHelpers()
  return useMutation({
    mutationFn: (body: ExamInput) => unwrap(api.POST('/admin/exams', { body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.examCreated')
    },
    onError: h.fail,
  })
}

export function useUpdateExam(examId: number) {
  const h = useExamMutationHelpers()
  return useMutation({
    mutationFn: (body: ExamInput) =>
      unwrap(api.PUT('/admin/exams/{examID}', { params: { path: { examID: examId } }, body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.examSaved')
    },
    onError: h.fail,
  })
}

export function useDeleteExam() {
  const h = useExamMutationHelpers()
  return useMutation({
    mutationFn: (examId: number) =>
      unwrap(api.DELETE('/admin/exams/{examID}', { params: { path: { examID: examId } } })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.examDeleted')
    },
    onError: h.fail,
  })
}
