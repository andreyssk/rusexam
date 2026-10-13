import { Music, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Asset, AssetType } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { useToast } from '@/shared/ui/toast'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Select } from '@/shared/ui/input'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useAssets, useAssetUrl } from '@/entities/asset'
import { TaskAudio } from '@/entities/task'
import { AssetForm, useCreateAsset, useDeleteAsset, useUpdateAsset } from '@/features/manage-assets'

const formatSize = (bytes: number) => (bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

function Thumb({ asset }: { asset: Asset }) {
  const { url } = useAssetUrl(asset.id)
  if (asset.type === 'image') {
    return url ? (
      <img src={url} alt="" className="size-14 shrink-0 rounded-xl border-2 object-cover" />
    ) : (
      <div className="size-14 shrink-0 rounded-xl border-2 bg-muted" />
    )
  }
  return (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 bg-muted text-muted-foreground">
      <Music size={22} />
    </div>
  )
}

export function AdminAssetList() {
  const { t } = useI18n()
  const confirm = useConfirm()
  const toast = useToast()
  const [type, setType] = useState<AssetType | ''>('')
  const { data, isPending, error } = useAssets(type || undefined)
  const create = useCreateAsset()
  const update = useUpdateAsset()
  const del = useDeleteAsset()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [previewId, setPreviewId] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">{t('admin.assets')}</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> {t('admin.newAsset')}
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardContent className="pt-5">
            <AssetForm
              submitLabel={t('admin.create')}
              pending={create.isPending}
              onCancel={() => setCreating(false)}
              onSubmit={(v) => create.mutate(v, { onSuccess: () => setCreating(false) })}
            />
          </CardContent>
        </Card>
      )}

      <Select className="w-auto" aria-label={t('asset.type')} value={type} onChange={(e) => setType(e.target.value as AssetType | '')}>
        <option value="">{t('asset.all')}</option>
        <option value="audio">{t('asset.type.audio')}</option>
        <option value="image">{t('asset.type.image')}</option>
      </Select>

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">{t('asset.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="py-4">
                  {editingId === a.id ? (
                    <AssetForm
                      initial={a}
                      submitLabel={t('admin.save')}
                      pending={update.isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(fields) => update.mutate({ id: a.id, fields }, { onSuccess: () => setEditingId(null) })}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Thumb asset={a} />
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="truncate font-extrabold">{a.name}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge>{t(`asset.type.${a.type}`)}</Badge>
                            {a.externalId && (
                              <Badge className="bg-accent-soft text-accent" translate="no">
                                {a.externalId}
                              </Badge>
                            )}
                            <span>{formatSize(a.size)}</span>
                            <span>· {a.usedCount > 0 ? t('asset.usedBy', { n: a.usedCount }) : t('asset.unused')}</span>
                          </p>
                        </div>
                        {a.type === 'audio' && (
                          <Button variant="ghost" size="sm" onClick={() => setPreviewId(previewId === a.id ? null : a.id)}>
                            {previewId === a.id ? t('asset.hidePreview') : t('asset.preview')}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setEditingId(a.id)}>
                          {t('admin.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          loading={del.isPending && del.variables === a.id}
                          disabled={del.isPending}
                          onClick={async () => {
                            if (a.usedCount > 0) return toast.error(t('asset.deleteBlocked'))
                            if (await confirm({ message: t('asset.deleteConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) del.mutate(a.id)
                          }}
                        >
                          {t('admin.delete')}
                        </Button>
                      </div>
                      {previewId === a.id && <TaskAudio assetId={a.id} />}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
