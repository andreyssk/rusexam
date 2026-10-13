import { BookOpen, Check, X } from 'lucide-react'
import type { Task } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
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
  const revealed = correctIndex !== undefined

  return (
    <div className="space-y-4">
      {task.audioAssetId != null && <TaskAudio assetId={task.audioAssetId} autoPlay={task.audioAutoplay} />}

      {task.passage && (
        // A light reading block: just a soft background and the book icon, with little padding so the text gets the width.
        <figure className="rounded-xl bg-muted px-2.5 py-2.5 md:px-4 md:py-3">
          {/* The instruction is Russian, like the task itself, whatever the interface language. */}
          <figcaption lang="ru" translate="no" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-accent">
            <BookOpen size={16} aria-hidden="true" />
            Прочитайте текст
          </figcaption>
          <div lang="ru" translate="no" className="max-w-prose space-y-3 text-base leading-[1.65] text-pretty md:text-lg md:leading-[1.7]">
            {task.passage
              .split(/\n+/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
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
