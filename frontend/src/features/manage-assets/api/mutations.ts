import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type AssetType } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

export type AssetFields = {
  type: AssetType
  name: string
  externalId: string
  /** Required when creating; when updating, omit it to keep the current file. */
  file?: File
}

function useAssetMutationHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => {
      void qc.invalidateQueries({ queryKey: ['assets'] })
      void qc.invalidateQueries({ queryKey: ['asset-file'] })
      void qc.invalidateQueries({ queryKey: ['admin-bank'] })
    },
    ok: (key: TKey) => toast.success(t(key)),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

// The file travels as multipart, so the client must send the FormData as is (and set the boundary itself).
const multipart = (f: AssetFields, withType: boolean) => {
  const form = new FormData()
  if (withType) form.set('type', f.type)
  form.set('name', f.name)
  form.set('externalId', f.externalId)
  if (f.file) form.set('file', f.file)
  return form as unknown as { name: string }
}
const asIs = (b: unknown) => b as BodyInit

export function useCreateAsset() {
  const h = useAssetMutationHelpers()
  return useMutation({
    mutationFn: (f: AssetFields) => unwrap(api.POST('/admin/assets', { body: multipart(f, true), bodySerializer: asIs })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.assetCreated')
    },
    onError: h.fail,
  })
}

export function useUpdateAsset() {
  const h = useAssetMutationHelpers()
  return useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: AssetFields }) =>
      unwrap(api.PUT('/admin/assets/{assetID}', { params: { path: { assetID: id } }, body: multipart(fields, false), bodySerializer: asIs })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.assetSaved')
    },
    onError: h.fail,
  })
}

export function useDeleteAsset() {
  const h = useAssetMutationHelpers()
  return useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/admin/assets/{assetID}', { params: { path: { assetID: id } } })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.assetDeleted')
    },
    onError: h.fail,
  })
}
