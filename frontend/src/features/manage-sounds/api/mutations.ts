import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type SoundSlot } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

function useSoundMutationHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => void qc.invalidateQueries({ queryKey: ['sounds'] }),
    saved: () => toast.success(t('toast.soundSaved')),
    deleted: () => toast.success(t('toast.soundDeleted')),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

export function useUploadSound() {
  const h = useSoundMutationHelpers()
  return useMutation({
    mutationFn: ({ slot, file }: { slot: SoundSlot; file: File }) => {
      const form = new FormData()
      form.set('file', file)
      // The client must send the FormData as is, so it sets the multipart boundary itself.
      return unwrap(
        api.PUT('/admin/sounds/{slot}', {
          params: { path: { slot } },
          body: form as unknown as { file: string },
          bodySerializer: (b) => b as unknown as BodyInit,
        }),
      )
    },
    onSuccess: () => {
      h.refresh()
      h.saved()
    },
    onError: h.fail,
  })
}

export function useDeleteSound() {
  const h = useSoundMutationHelpers()
  return useMutation({
    mutationFn: (slot: SoundSlot) => unwrap(api.DELETE('/admin/sounds/{slot}', { params: { path: { slot } } })),
    onSuccess: () => {
      h.refresh()
      h.deleted()
    },
    onError: h.fail,
  })
}
