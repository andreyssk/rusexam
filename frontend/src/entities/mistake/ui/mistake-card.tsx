import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Mistake } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { formatDate } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'

const LETTERS = 'ABCDEFGH'

/** A task the learner got wrong: the question, how many times, and (unfolded) the options with the right one and their last wrong pick. */
export function MistakeCard({ mistake }: { mistake: Mistake }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const { task } = mistake

  return (
    <Card>
      <CardContent className="py-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full cursor-pointer items-start gap-3 text-left"
        >
          <span lang="ru" translate="no" className={cn('min-w-0 flex-1 text-sm font-bold leading-snug', !open && 'line-clamp-3')}>
            {task.prompt}
          </span>
          <Badge className="shrink-0 bg-danger-soft text-destructive tabular-nums" aria-label={t('mistakes.count', { n: mistake.mistakes })}>
            {mistake.mistakes}×
          </Badge>
          <ChevronDown size={18} aria-hidden="true" className={cn('mt-0.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
        <p className="mt-1 text-xs text-muted-foreground">{t('mistakes.last', { date: formatDate(mistake.lastMistakeAt, lang) })}</p>

        {open && (
          <div className="mt-3 space-y-2 border-t-2 pt-3 text-sm">
            {task.passage && <p lang="ru" translate="no" className="text-xs text-muted-foreground">{task.passage}</p>}
            <ol className="space-y-1" lang="ru" translate="no">
              {task.options.map((opt, i) => {
                const correct = i === task.correctIndex
                const wrong = i === mistake.lastSelectedIndex && !correct
                return (
                  <li
                    key={i}
                    className={cn(
                      'rounded-xl px-3 py-1.5',
                      correct && 'bg-success-soft font-bold text-success',
                      wrong && 'bg-danger-soft font-bold text-destructive',
                      !correct && !wrong && 'text-muted-foreground',
                    )}
                  >
                    {LETTERS[i]}. {opt}
                    {wrong && <span className="ml-2 text-xs font-medium" lang={lang}>← {t('mistakes.yourAnswer')}</span>}
                  </li>
                )
              })}
            </ol>
            {task.explanation && (
              <p lang="ru" translate="no" className="text-xs text-muted-foreground">
                <span className="font-bold">{t('run.explanation')}: </span>
                {task.explanation}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
