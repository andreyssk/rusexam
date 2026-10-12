import { useState, type FormEvent } from 'react'
import type { CourseInput } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'

const FLAGS = ['🇷🇺', '🇬🇧', '🇺🇸', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹', '🇵🇹', '🇹🇷', '🇨🇳', '🇯🇵', '🇰🇷']

type Props = {
  initial?: CourseInput
  submitLabel: string
  pending?: boolean
  onSubmit: (v: CourseInput) => void
  onCancel?: () => void
}

export function CourseForm({ initial, submitLabel, pending, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [v, setV] = useState({ titleRu: initial?.titleRu ?? '', titleEn: initial?.titleEn ?? '', flag: initial?.flag ?? '' })
  const set = (k: 'titleRu' | 'titleEn') => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(v)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="courseTitleRu">{t('admin.titleRu')}</Label>
          <Input id="courseTitleRu" lang="ru" value={v.titleRu} onChange={set('titleRu')} />
        </div>
        <div>
          <Label htmlFor="courseTitleEn">{t('admin.titleEn')}</Label>
          <Input id="courseTitleEn" lang="en" value={v.titleEn} onChange={set('titleEn')} />
        </div>
      </div>
      <div>
        <Label htmlFor="courseFlag">{t('course.flag')}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input id="courseFlag" required maxLength={16} translate="no" className="w-24 text-center text-xl" value={v.flag} onChange={(e) => setV((p) => ({ ...p, flag: e.target.value }))} />
          {FLAGS.map((f) => (
            <button
              key={f}
              type="button"
              translate="no"
              aria-label={f}
              onClick={() => setV((p) => ({ ...p, flag: f }))}
              className={cn('cursor-pointer rounded-xl border-2 px-2 py-1 text-xl leading-none hover:bg-muted', v.flag === f && 'border-accent bg-accent-soft')}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('course.flagHint')}</p>
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
