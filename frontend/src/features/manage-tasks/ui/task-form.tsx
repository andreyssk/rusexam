import { Music, Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import type { Task, TaskInput } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { ErrorMessage } from '@/shared/ui/states'
import { TaskAudio } from '@/entities/task'
import type { AudioChange } from '../api/hooks'

type Props = {
  initial?: Task
  pending?: boolean
  onSubmit: (v: TaskInput, audio: AudioChange) => void
  onCancel: () => void
}

const emptyOptions = () => ['', '']
const MAX_AUDIO_BYTES = 5 << 20

export function TaskForm({ initial, pending, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [passage, setPassage] = useState(initial?.passage ?? '')
  const [options, setOptions] = useState<string[]>(initial ? [...initial.options] : emptyOptions())
  const [correct, setCorrect] = useState(initial?.correctIndex ?? 0)
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  // The mp3: a newly picked file, or a request to drop the current one.
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [removeAudio, setRemoveAudio] = useState(false)
  const [audioError, setAudioError] = useState('')
  const audioInput = useRef<HTMLInputElement>(null)

  const pickAudio = (file: File | undefined) => {
    if (audioInput.current) audioInput.current.value = '' // allow choosing the same file again
    if (!file) return
    if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') return setAudioError(t('admin.audioNotMp3'))
    if (file.size > MAX_AUDIO_BYTES) return setAudioError(t('admin.audioTooBig'))
    setAudioError('')
    setAudioFile(file)
    setRemoveAudio(false)
  }
  const hasCurrentAudio = !!initial?.hasAudio && !removeAudio && !audioFile

  const setOption = (i: number, value: string) => setOptions((os) => os.map((o, j) => (j === i ? value : o)))

  const removeOption = (i: number) => {
    setOptions((os) => os.filter((_, j) => j !== i))
    setCorrect((c) => (i < c ? c - 1 : i === c ? 0 : c))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const audio: AudioChange = audioFile ? { file: audioFile } : removeAudio && initial?.hasAudio ? { remove: true } : undefined
    onSubmit({ prompt, passage, options, correctIndex: correct, explanation }, audio)
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

      <div className="space-y-2">
        {/* Not a <label for>: a full-width label would open the file picker from anywhere in this row. */}
        <p className="mb-1.5 text-sm font-bold">{t('admin.audio')}</p>
        <input
          ref={audioInput}
          aria-label={t('admin.audioChoose')}
          type="file"
          accept="audio/mpeg,.mp3"
          className="sr-only"
          onChange={(e) => pickAudio(e.target.files?.[0])}
        />
        {hasCurrentAudio && initial && <TaskAudio taskId={initial.id} />}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => audioInput.current?.click()}>
            <Music size={14} /> {t('admin.audioChoose')}
          </Button>
          {audioFile && <span className="truncate text-sm text-muted-foreground">{audioFile.name}</span>}
          {(hasCurrentAudio || audioFile) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                setAudioFile(null)
                setRemoveAudio(true)
              }}
            >
              <Trash2 size={14} /> {t('admin.audioRemove')}
            </Button>
          )}
        </div>
        {audioError && <ErrorMessage message={audioError} />}
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
