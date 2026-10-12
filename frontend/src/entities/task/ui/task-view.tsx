import { Check, X } from 'lucide-react'
import type { Task } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'

type Props = {
  task: Task
  selectedIndex?: number
  /** Set once the correct answer may be shown (training feedback). */
  correctIndex?: number
  disabled?: boolean
  showTranslation?: boolean
  onSelect?: (index: number) => void
}

const LETTERS = 'ABCDEFGH'

export function TaskView({ task, selectedIndex, correctIndex, disabled, showTranslation, onSelect }: Props) {
  const { t } = useI18n()
  const revealed = correctIndex !== undefined

  return (
    <div className="space-y-4">
      {task.passageRu && (
        <figure className="rounded-lg border-l-4 border-primary bg-muted p-4">
          <figcaption className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('run.passage')}
          </figcaption>
          <p lang="ru" className="text-base leading-relaxed">{task.passageRu}</p>
          {showTranslation && task.passageEn && (
            <p lang="en" className="mt-2 text-sm italic text-muted-foreground">{task.passageEn}</p>
          )}
        </figure>
      )}

      <div>
        <h2 lang="ru" className="text-xl font-semibold leading-snug">{task.promptRu}</h2>
        {showTranslation && task.promptEn && (
          <p lang="en" className="mt-1 text-sm italic text-muted-foreground">{task.promptEn}</p>
        )}
      </div>

      <ul className="space-y-2" role="radiogroup">
        {task.options.map((opt, i) => {
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
                  'flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors',
                  !disabled && 'cursor-pointer hover:bg-muted',
                  selected && !revealed && 'border-primary bg-primary-soft',
                  isCorrect && 'border-success bg-success-soft',
                  isWrong && 'border-destructive bg-danger-soft',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    selected && !revealed && 'border-primary bg-primary text-primary-foreground',
                    isCorrect && 'border-success bg-success text-primary-foreground',
                    isWrong && 'border-destructive bg-destructive text-primary-foreground',
                  )}
                >
                  {isCorrect ? <Check size={14} aria-label="correct" /> : isWrong ? <X size={14} aria-label="wrong" /> : LETTERS[i]}
                </span>
                <span>
                  <span lang="ru" className="block">{opt.ru}</span>
                  {showTranslation && opt.en && (
                    <span lang="en" className="block text-sm italic text-muted-foreground">{opt.en}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
