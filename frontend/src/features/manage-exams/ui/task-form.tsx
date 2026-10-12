import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SECTIONS, type Option, type Section, type Task, type TaskInput } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label, Select, Textarea } from '@/shared/ui/input'
import { ErrorMessage } from '@/shared/ui/states'

type Props = {
  initial?: Task
  pending?: boolean
  error?: unknown
  onSubmit: (v: TaskInput) => void
  onCancel: () => void
}

const emptyOptions = (): Option[] => [{ ru: '', en: '' }, { ru: '', en: '' }]

export function TaskForm({ initial, pending, error, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [section, setSection] = useState<Section>(initial?.section ?? 'vocabulary')
  const [promptRu, setPromptRu] = useState(initial?.promptRu ?? '')
  const [promptEn, setPromptEn] = useState(initial?.promptEn ?? '')
  const [passageRu, setPassageRu] = useState(initial?.passageRu ?? '')
  const [passageEn, setPassageEn] = useState(initial?.passageEn ?? '')
  const [options, setOptions] = useState<Option[]>(
    initial ? initial.options.map((o) => ({ ru: o.ru, en: o.en ?? '' })) : emptyOptions(),
  )
  const [correct, setCorrect] = useState(initial?.correctIndex ?? 0)
  const [explanationRu, setExplanationRu] = useState(initial?.explanationRu ?? '')
  const [explanationEn, setExplanationEn] = useState(initial?.explanationEn ?? '')

  const setOption = (i: number, patch: Partial<Option>) =>
    setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)))

  const removeOption = (i: number) => {
    setOptions((os) => os.filter((_, j) => j !== i))
    setCorrect((c) => (i < c ? c - 1 : i === c ? 0 : c))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({
      section,
      promptRu,
      promptEn,
      passageRu,
      passageEn,
      options,
      correctIndex: correct,
      explanationRu,
      explanationEn,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="section">{t('admin.section')}</Label>
        <Select id="section" value={section} onChange={(e) => setSection(e.target.value as Section)}>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`section.${s}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="passageRu">{t('admin.passageRu')}</Label>
          <Textarea id="passageRu" lang="ru" value={passageRu} onChange={(e) => setPassageRu(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="passageEn">{t('admin.passageEn')}</Label>
          <Textarea id="passageEn" lang="en" value={passageEn} onChange={(e) => setPassageEn(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="promptRu">{t('admin.promptRu')}</Label>
          <Textarea id="promptRu" lang="ru" required value={promptRu} onChange={(e) => setPromptRu(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="promptEn">{t('admin.promptEn')}</Label>
          <Textarea id="promptEn" lang="en" value={promptEn} onChange={(e) => setPromptEn(e.target.value)} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium">{t('admin.options')}</legend>
        {options.map((o, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <label className="flex shrink-0 items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="correct"
                checked={correct === i}
                onChange={() => setCorrect(i)}
                aria-label={`${t('admin.correct')} ${i + 1}`}
              />
              {t('admin.correct')}
            </label>
            <Input
              lang="ru"
              required
              placeholder={t('admin.optionRu')}
              aria-label={`${t('admin.optionRu')} ${i + 1}`}
              value={o.ru}
              onChange={(e) => setOption(i, { ru: e.target.value })}
            />
            <Input
              lang="en"
              placeholder={t('admin.optionEn')}
              aria-label={`${t('admin.optionEn')} ${i + 1}`}
              value={o.en ?? ''}
              onChange={(e) => setOption(i, { en: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={options.length <= 2}
              onClick={() => removeOption(i)}
              aria-label={t('admin.removeOption')}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        {options.length < 8 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setOptions((os) => [...os, { ru: '', en: '' }])}>
            <Plus size={14} /> {t('admin.addOption')}
          </Button>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="explRu">{t('admin.explRu')}</Label>
          <Textarea id="explRu" lang="ru" value={explanationRu} onChange={(e) => setExplanationRu(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="explEn">{t('admin.explEn')}</Label>
          <Textarea id="explEn" lang="en" value={explanationEn} onChange={(e) => setExplanationEn(e.target.value)} />
        </div>
      </div>

      {error != null && <ErrorMessage error={error} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {t('admin.save')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('admin.cancel')}
        </Button>
      </div>
    </form>
  )
}
