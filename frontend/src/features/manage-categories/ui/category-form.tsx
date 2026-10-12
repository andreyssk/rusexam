import { useState, type FormEvent } from 'react'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import type { CategoryFields } from '../api/mutations'

type Props = {
  initial?: CategoryFields
  submitLabel: string
  pending?: boolean
  onSubmit: (v: CategoryFields) => void
  onCancel?: () => void
}

export function CategoryForm({ initial, submitLabel, pending, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [v, setV] = useState({ titleRu: initial?.titleRu ?? '', titleEn: initial?.titleEn ?? '' })
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(v)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="categoryTitleRu">{t('admin.titleRu')}</Label>
          <Input id="categoryTitleRu" lang="ru" value={v.titleRu} onChange={set('titleRu')} />
        </div>
        <div>
          <Label htmlFor="categoryTitleEn">{t('admin.titleEn')}</Label>
          <Input id="categoryTitleEn" lang="en" value={v.titleEn} onChange={set('titleEn')} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
