import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type CourseInput } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

function useCourseMutationHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => void qc.invalidateQueries({ queryKey: ['courses'] }),
    ok: (key: TKey) => toast.success(t(key)),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

export function useCreateCourse() {
  const h = useCourseMutationHelpers()
  return useMutation({
    mutationFn: (body: CourseInput) => unwrap(api.POST('/admin/courses', { body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.courseCreated')
    },
    onError: h.fail,
  })
}

export function useUpdateCourse() {
  const h = useCourseMutationHelpers()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CourseInput }) =>
      unwrap(api.PUT('/admin/courses/{courseID}', { params: { path: { courseID: id } }, body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.courseSaved')
    },
    onError: h.fail,
  })
}

export function useDeleteCourse() {
  const h = useCourseMutationHelpers()
  return useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/admin/courses/{courseID}', { params: { path: { courseID: id } } })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.courseDeleted')
    },
    onError: h.fail,
  })
}
