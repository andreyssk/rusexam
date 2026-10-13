import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AdminTask, TaskInput } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label, Select, Textarea } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/switch'
import { useAssets } from '@/entities/asset'
import { TaskAudio } from '@/entities/task'

type Props = {
  initial?: AdminTask
  pending?: boolean
  onSubmit: (v: TaskInput) => void
  onCancel: () => void
}

const emptyOptions = () => ['', '']

export function TaskForm({ initial, pending, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [passage, setPassage] = useState(initial?.passage ?? '')
  const [options, setOptions] = useState<string[]>(initial ? [...initial.options] : emptyOptions())
  const [correct, setCorrect] = useState(initial?.correctIndex ?? 0)
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [externalId, setExternalId] = useState(initial?.externalId ?? '')
  // The audio is an asset from the library, shared with any other task that uses it.
  const [audioAssetId, setAudioAssetId] = useState<number | null>(initial?.audioAssetId ?? null)
  const [autoplay, setAutoplay] = useState(initial?.audioAutoplay ?? true)
  const assets = useAssets('audio')

  const setOption = (i: number, value: string) => setOptions((os) => os.map((o, j) => (j === i ? value : o)))

  const removeOption = (i: number) => {
    setOptions((os) => os.filter((_, j) => j !== i))
    setCorrect((c) => (i < c ? c - 1 : i === c ? 0 : c))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ prompt, passage, options, correctIndex: correct, explanation, audioAssetId, audioAutoplay: autoplay, externalId })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="passage">{t('admin.passage')}</Label>
          <Textarea id="passage" lang="ru" translate="no" value={passage} onChange={(e) => setPassage(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="prompt">{t('admin.prompt')}</Label>
          <Textarea id="prompt" lang="ru" translate="no" required value={prompt} onChange={(e) => setPrompt(e.target.value)} />
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
              translate="no"
              required
              placeholder={t('admin.option')}
              aria-label={`${t('admin.option')} ${i + 1}`}
              value={o}
              onChange={(e) => setOption(i, e.target.value)}
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
          <Button type="button" variant="outline" size="sm" onClick={() => setOptions((os) => [...os, ''])}>
            <Plus size={14} /> {t('admin.addOption')}
          </Button>
        )}
      </fieldset>

      <div className="space-y-3">
        <div>
          <Label htmlFor="audioAsset">{t('admin.audio')}</Label>
          <Select
            id="audioAsset"
            value={audioAssetId ?? ''}
            onChange={(e) => setAudioAssetId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{t('admin.audioNone')}</option>
            {assets.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.externalId ? ` (${a.externalId})` : ''}
              </option>
            ))}
          </Select>
          {assets.data?.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('admin.audioNoAssets')}{' '}
              <Link to="/admin/assets" className="font-bold text-accent hover:underline">
                {t('nav.assets')}
              </Link>
            </p>
          )}
        </div>
        {audioAssetId != null && (
          <>
            <TaskAudio key={audioAssetId} assetId={audioAssetId} />
            <Switch checked={autoplay} onChange={setAutoplay} label={t('admin.autoplay')} hint={t('admin.autoplayHint')} />
          </>
        )}
      </div>

      <div className="max-w-sm">
        <Label htmlFor="externalId">{t('admin.externalId')}</Label>
        <Input id="externalId" translate="no" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
        <p className="mt-1 text-xs text-muted-foreground">{t('admin.externalIdHint')}</p>
      </div>

      <div>
        <Label htmlFor="explanation">{t('admin.expl')}</Label>
        <Textarea id="explanation" lang="ru" translate="no" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {t('admin.save')}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
