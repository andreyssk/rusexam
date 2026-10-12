import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type CategoryInput } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

function useCategoryMutationHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => void qc.invalidateQueries({ queryKey: ['categories'] }),
    ok: (key: TKey) => toast.success(t(key)),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

export type CategoryFields = Omit<CategoryInput, 'courseId'>

/** Creates a category in the given course. */
export function useCreateCategory() {
  const h = useCategoryMutationHelpers()
  return useMutation({
    mutationFn: (body: CategoryFields & { courseId: number }) => unwrap(api.POST('/admin/categories', { body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.categoryCreated')
    },
    onError: h.fail,
  })
}

export function useUpdateCategory() {
  const h = useCategoryMutationHelpers()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryFields }) =>
      unwrap(api.PUT('/admin/categories/{categoryID}', { params: { path: { categoryID: id } }, body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.categorySaved')
    },
    onError: h.fail,
  })
}

export function useDeleteCategory() {
  const h = useCategoryMutationHelpers()
  return useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/admin/categories/{categoryID}', { params: { path: { categoryID: id } } })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.categoryDeleted')
    },
    onError: h.fail,
  })
}
