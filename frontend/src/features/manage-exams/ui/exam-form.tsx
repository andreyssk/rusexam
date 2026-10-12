import { useState, type FormEvent } from 'react'
import { LEVELS, type ExamInput, type Level } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label, Select, Textarea } from '@/shared/ui/input'

type Props = {
  initial?: ExamInput
  submitLabel: string
  pending?: boolean
  onSubmit: (v: ExamInput) => void
  onCancel?: () => void
}

export function ExamForm({ initial, submitLabel, pending, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [v, setV] = useState<Required<ExamInput>>({
    level: initial?.level ?? 'rvp',
    titleRu: initial?.titleRu ?? '',
    titleEn: initial?.titleEn ?? '',
    descriptionRu: initial?.descriptionRu ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
  })
  const set = (k: Exclude<keyof ExamInput, 'level'>) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(v)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="level">{t('admin.level')}</Label>
        <Select id="level" translate="no" value={v.level} onChange={(e) => setV((p) => ({ ...p, level: e.target.value as Level }))}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {t(`level.${l}`)}
            </option>
          ))}
        </Select>
      </div>
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
