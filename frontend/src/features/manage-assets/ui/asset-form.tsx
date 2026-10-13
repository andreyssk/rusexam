import { useState, type FormEvent } from 'react'
import type { Asset, AssetType } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label, Select } from '@/shared/ui/input'
import { ErrorMessage } from '@/shared/ui/states'
import type { AssetFields } from '../api/mutations'

const MAX_BYTES = 5 << 20

type Props = {
  /** Present when editing: the type is then fixed and the file is optional. */
  initial?: Asset
  submitLabel: string
  pending?: boolean
  onSubmit: (v: AssetFields) => void
  onCancel: () => void
}

export function AssetForm({ initial, submitLabel, pending, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [type, setType] = useState<AssetType>(initial?.type ?? 'audio')
  const [name, setName] = useState(initial?.name ?? '')
  const [externalId, setExternalId] = useState(initial?.externalId ?? '')
  const [file, setFile] = useState<File | undefined>()
  const [fileError, setFileError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ type, name, externalId, file })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="assetName">{t('asset.name')}</Label>
          <Input id="assetName" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="assetExternalId">{t('asset.externalId')}</Label>
          <Input id="assetExternalId" translate="no" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">{t('asset.externalIdHint')}</p>
        </div>
        {!initial && (
          <div>
            <Label htmlFor="assetType">{t('asset.type')}</Label>
            <Select id="assetType" value={type} onChange={(e) => setType(e.target.value as AssetType)}>
              <option value="audio">{t('asset.type.audio')}</option>
              <option value="image">{t('asset.type.image')}</option>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="assetFile">{initial ? t('asset.replaceFile') : t('asset.file')}</Label>
          <input
            id="assetFile"
            type="file"
            required={!initial}
            accept={type === 'audio' ? 'audio/mpeg,.mp3' : 'image/png,image/jpeg,image/gif,image/webp'}
            className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-xl file:border-2 file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-bold"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && f.size > MAX_BYTES) {
                e.target.value = ''
                setFile(undefined)
                return setFileError(t('asset.fileTooBig'))
              }
              setFileError('')
              setFile(f)
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">{type === 'audio' ? t('asset.fileHintAudio') : t('asset.fileHintImage')}</p>
          {fileError && <ErrorMessage message={fileError} />}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
