import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type ExamInput, type ExamStatus } from '@/shared/api'
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

type ExamFields = Omit<ExamInput, 'courseId'>

/** Creates an exam in the currently selected course. */
export function useCreateExam() {
  const h = useExamMutationHelpers()
  return useMutation({
    mutationFn: (body: ExamFields & { courseId: number }) => unwrap(api.POST('/admin/exams', { body })),
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
    mutationFn: (body: ExamFields) =>
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

/** Approves an exam so learners can see it, or sends it back to pending. */
export function useSetExamStatus() {
  const h = useExamMutationHelpers()
  return useMutation({
    mutationFn: ({ examId, status }: { examId: number; status: ExamStatus }) =>
      unwrap(api.PUT('/admin/exams/{examID}/status', { params: { path: { examID: examId } }, body: { status } })),
    onSuccess: (_, v) => {
      h.refresh()
      h.ok(v.status === 'approved' ? 'toast.examApproved' : 'toast.examUnapproved')
    },
    onError: h.fail,
  })
}
