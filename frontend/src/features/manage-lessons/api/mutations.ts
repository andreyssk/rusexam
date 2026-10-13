import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type LessonInput, type LessonStatus } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

function useLessonMutationHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => {
      void qc.invalidateQueries({ queryKey: ['lessons'] })
      void qc.invalidateQueries({ queryKey: ['lesson'] })
    },
    ok: (key: Parameters<typeof t>[0]) => toast.success(t(key)),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

type LessonFields = Omit<LessonInput, 'courseId'>

/** Creates a lesson in the currently selected course. */
export function useCreateLesson() {
  const h = useLessonMutationHelpers()
  return useMutation({
    mutationFn: (body: LessonFields & { courseId: number }) => unwrap(api.POST('/admin/lessons', { body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.lessonCreated')
    },
    onError: h.fail,
  })
}

export function useUpdateLesson(lessonId: number) {
  const h = useLessonMutationHelpers()
  return useMutation({
    mutationFn: (body: LessonFields) =>
      unwrap(api.PUT('/admin/lessons/{lessonID}', { params: { path: { lessonID: lessonId } }, body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.lessonSaved')
    },
    onError: h.fail,
  })
}

export function useDeleteLesson() {
  const h = useLessonMutationHelpers()
  return useMutation({
    mutationFn: (lessonId: number) =>
      unwrap(api.DELETE('/admin/lessons/{lessonID}', { params: { path: { lessonID: lessonId } } })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.lessonDeleted')
    },
    onError: h.fail,
  })
}

/** Approves a lesson so learners can see it, or sends it back to pending. */
export function useSetLessonStatus() {
  const h = useLessonMutationHelpers()
  return useMutation({
    mutationFn: ({ lessonId, status }: { lessonId: number; status: LessonStatus }) =>
      unwrap(api.PUT('/admin/lessons/{lessonID}/status', { params: { path: { lessonID: lessonId } }, body: { status } })),
    onSuccess: (_, v) => {
      h.refresh()
      h.ok(v.status === 'approved' ? 'toast.lessonApproved' : 'toast.lessonUnapproved')
    },
    onError: h.fail,
  })
}
