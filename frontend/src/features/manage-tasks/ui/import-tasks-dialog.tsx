import { Download, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TaskInput } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Label, Select, Textarea } from '@/shared/ui/input'
import { ErrorMessage } from '@/shared/ui/states'
import { useCurrentCourse } from '@/entities/course'
import { useExams } from '@/entities/exam'
import { useImportTasks } from '../api/hooks'

const EXAMPLE: TaskInput[] = [
  {
    prompt: 'Выберите правильную форму: Я живу в ___ (Москва).',
    passage: '',
    options: ['Москва', 'Москвы', 'Москве', 'Москвой'],
    correctIndex: 2,
    explanation: 'После «в» на вопрос «где?» нужен предложный падеж: в Москве.',
    externalId: 'EXT-0001',
  },
  {
    prompt: 'Кто первым полетел в космос?',
    passage: '',
    options: ['Юрий Гагарин', 'Герман Титов', 'Алексей Леонов'],
    correctIndex: 0,
    explanation: '',
    externalId: 'EXT-0002',
  },
]

/** Accepts either a bare array of tasks or an object with a "tasks" array. */
function parseTasks(text: string): TaskInput[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data) ? data : (data as { tasks?: unknown } | null)?.tasks
  if (!Array.isArray(list)) throw new Error('not-a-list')
  return list as TaskInput[]
}

type DialogProps = {
  open: boolean
  onClose: () => void
  /** Import straight into this exam (of `courseId`): the new tasks are appended to it and the exam picker is hidden. */
  target?: { examId: number; courseId: number }
}

export function ImportTasksDialog({ open, onClose, target }: DialogProps) {
  const { t, pick } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const exams = useExams()
  const { course } = useCurrentCourse()
  const imp = useImportTasks()
  // The pasted (or file-loaded) text is the single source of truth; parsing is derived from it.
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [examId, setExamId] = useState('')

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
    if (!open) {
      setText('')
      setFileName('')
      setExamId('')
      imp.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const parsed = useMemo(() => {
    if (!text.trim()) return { tasks: null, bad: false }
    try {
      return { tasks: parseTasks(text), bad: false }
    } catch {
      return { tasks: null, bad: true }
    }
  }, [text])
  const tasks = parsed.tasks

  const onFile = async (file: File | undefined) => {
    imp.reset()
    if (!file) return
    setFileName(file.name)
    setText(await file.text())
    if (fileInput.current) fileInput.current.value = '' // allow choosing the same file again
  }

  const downloadExample = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(EXAMPLE, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'tasks-example.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="import-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!imp.isPending) onClose()
      }}
      onClick={(e) => e.target === dialog.current && !imp.isPending && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border-2 border-b-4 bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 id="import-title" className="text-lg font-extrabold">
            {t('admin.importTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('admin.importHint')}</p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label={t('admin.importChoose')}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload size={14} /> {t('admin.importChoose')}
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadExample}>
              <Download size={14} /> {t('admin.importExample')}
            </Button>
            {fileName && <span className="truncate text-sm text-muted-foreground">{fileName}</span>}
          </div>

          <div>
            <Label htmlFor="import-json">{t('admin.importPaste')}</Label>
            <Textarea
              id="import-json"
              translate="no"
              spellCheck={false}
              rows={8}
              className="font-mono text-sm"
              placeholder={'[\n  { "prompt": "…", "options": ["…", "…"], "correctIndex": 0 }\n]'}
              value={text}
              onChange={(e) => {
                imp.reset()
                setFileName('')
                setText(e.target.value)
              }}
            />
          </div>

          {parsed.bad && <ErrorMessage message={t('admin.importBadFile')} />}
          {tasks && <p className="text-sm font-bold">{t('admin.importFound', { n: tasks.length })}</p>}

          {!target && (
          <div>
            <Label htmlFor="import-exam">{t('admin.importLink')}</Label>
            <Select id="import-exam" value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">{t('admin.importNoExam')}</option>
              {exams.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {pick(x.titleRu, x.titleEn)}
                </option>
              ))}
            </Select>
          </div>
          )}

          {imp.isError && <ErrorMessage error={imp.error} />}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={imp.isPending} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              loading={imp.isPending}
              disabled={!tasks || tasks.length === 0}
              onClick={() => {
                const courseId = target?.courseId ?? course?.id
                const exam = target?.examId ?? (examId ? Number(examId) : undefined)
                if (tasks && courseId) imp.mutate({ courseId, tasks, examId: exam }, { onSuccess: onClose })
              }}
            >
              {t('admin.importRun')}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
