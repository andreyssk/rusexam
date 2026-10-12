import { useState, type FormEvent } from 'react'
import type { ExamInput } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { ErrorMessage } from '@/shared/ui/states'

type Props = {
  initial?: ExamInput
  submitLabel: string
  pending?: boolean
  error?: unknown
  onSubmit: (v: ExamInput) => void
  onCancel?: () => void
}

export function ExamForm({ initial, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [v, setV] = useState<Required<ExamInput>>({
    titleRu: initial?.titleRu ?? '',
    titleEn: initial?.titleEn ?? '',
    descriptionRu: initial?.descriptionRu ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
  })
  const set = (k: keyof ExamInput) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(v)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="titleRu">{t('admin.titleRu')}</Label>
          <Input id="titleRu" lang="ru" value={v.titleRu} onChange={set('titleRu')} />
        </div>
        <div>
          <Label htmlFor="titleEn">{t('admin.titleEn')}</Label>
          <Input id="titleEn" lang="en" value={v.titleEn} onChange={set('titleEn')} />
        </div>
        <div>
          <Label htmlFor="descRu">{t('admin.descRu')}</Label>
          <Textarea id="descRu" lang="ru" value={v.descriptionRu} onChange={set('descriptionRu')} />
        </div>
        <div>
          <Label htmlFor="descEn">{t('admin.descEn')}</Label>
          <Textarea id="descEn" lang="en" value={v.descriptionEn} onChange={set('descriptionEn')} />
        </div>
      </div>
      {error != null && <ErrorMessage error={error} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('admin.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
