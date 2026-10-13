import { Check, X } from 'lucide-react'
import type { Task } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { TaskAudio } from './task-audio'

type Props = {
  task: Task
  selectedIndex?: number
  /** Set once the correct answer may be shown (training feedback). */
  correctIndex?: number
  disabled?: boolean
  onSelect?: (index: number) => void
  /** The order the options are shown in, as indexes into `task.options`; selectedIndex, correctIndex and onSelect keep using the original indexes. */
  order?: number[]
}

const LETTERS = 'ABCDEFGH'

export function TaskView({ task, selectedIndex, correctIndex, disabled, onSelect, order }: Props) {
  const { t } = useI18n()
  const revealed = correctIndex !== undefined

  return (
    <div className="space-y-4">
      {task.hasAudio && <TaskAudio taskId={task.id} autoPlay />}

      {task.passage && (
        <figure className="rounded-2xl border-2 border-b-4 bg-muted p-4">
          <figcaption className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('run.passage')}
          </figcaption>
          <p lang="ru" translate="no" className="text-base leading-relaxed">{task.passage}</p>
        </figure>
      )}

      <div>
        <h2 lang="ru" translate="no" className="text-2xl font-extrabold leading-snug">{task.prompt}</h2>
      </div>

      <ul className="space-y-2" role="radiogroup">
        {(order ?? task.options.map((_, i) => i)).map((i, pos) => {
          const opt = task.options[i]
          const selected = selectedIndex === i
          const isCorrect = revealed && correctIndex === i
          const isWrong = revealed && selected && correctIndex !== i
          return (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onSelect?.(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 bg-card px-4 py-3 text-left font-bold transition-colors',
                  !disabled && 'cursor-pointer hover:bg-muted active:translate-y-0.5',
                  selected && !revealed && 'border-accent bg-accent-soft text-accent hover:bg-accent-soft',
                  isCorrect && 'border-success bg-success-soft text-success',
                  isWrong && 'border-destructive bg-danger-soft text-destructive',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-extrabold',
                    selected && !revealed && 'border-accent text-accent',
                    isCorrect && 'border-success bg-success text-primary-foreground',
                    isWrong && 'border-destructive bg-destructive text-destructive-foreground',
                  )}
                >
                  {isCorrect ? <Check size={14} aria-label="correct" /> : isWrong ? <X size={14} aria-label="wrong" /> : LETTERS[pos]}
                </span>
                <span lang="ru" translate="no" className="block text-lg">{opt}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
