import { useState, type FormEvent } from 'react'
import type { ExamInput } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label, Select, Textarea } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/switch'
import { useCategories } from '@/entities/category'

/** The course is fixed when an exam is created, so the form does not edit it. */
export type ExamFields = Omit<ExamInput, 'courseId'>

type Props = {
  /** Whose categories can be picked. */
  courseId: number
  initial?: ExamFields
  submitLabel: string
  pending?: boolean
  onSubmit: (v: ExamFields) => void
  onCancel?: () => void
}

export function ExamForm({ courseId, initial, submitLabel, pending, onSubmit, onCancel }: Props) {
  const { t, pick } = useI18n()
  const categories = useCategories(courseId)
  const [v, setV] = useState<Required<ExamFields>>({
    categoryId: initial?.categoryId ?? null,
    preserveOrder: initial?.preserveOrder ?? false,
    titleRu: initial?.titleRu ?? '',
    titleEn: initial?.titleEn ?? '',
    descriptionRu: initial?.descriptionRu ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
  })
  const set = (k: Exclude<keyof ExamFields, 'categoryId' | 'preserveOrder'>) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(v)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="examCategory">{t('category.label')}</Label>
        <Select
          id="examCategory"
          className="sm:max-w-sm"
          value={v.categoryId ?? ''}
          onChange={(e) => setV((p) => ({ ...p, categoryId: e.target.value ? Number(e.target.value) : null }))}
        >
          <option value="">{t('category.none')}</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {pick(c.titleRu, c.titleEn)}
            </option>
          ))}
        </Select>
      </div>
      <Switch
        checked={v.preserveOrder}
        onChange={(preserveOrder) => setV((p) => ({ ...p, preserveOrder }))}
        label={t('admin.preserveOrder')}
        hint={t('admin.preserveOrderHint')}
      />
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
