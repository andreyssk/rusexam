import { useState } from 'react'
import { LEVELS, type Level } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { ExamRow, useExams } from '@/entities/exam'
import { StartAttempt } from '@/features/start-attempt'

export function ExamList() {
  const { t } = useI18n()
  const { data, isPending, error } = useExams()
  const [level, setLevel] = useState<Level | ''>('')

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  if (data.length === 0) return <p className="py-10 text-center text-muted-foreground">{t('home.empty')}</p>

  const exams = level ? data.filter((e) => e.level === level) : data
  const chips: (Level | '')[] = ['', ...LEVELS]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('admin.level')}>
        {chips.map((l) => (
          <button
            key={l || 'all'}
            type="button"
            role="radio"
            aria-checked={level === l}
            translate={l ? 'no' : undefined}
            onClick={() => setLevel(l)}
            className={cn(
              'cursor-pointer rounded-full border-2 px-4 py-1.5 text-sm font-bold',
              level === l ? 'border-accent bg-accent-soft text-accent' : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {l ? t(`level.${l}`) : t('level.all')}
          </button>
        ))}
      </div>
      {exams.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{t('home.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {exams.map((exam) => (
            <ExamRow key={exam.id} exam={exam} actions={<StartAttempt compact examId={exam.id} disabled={exam.tasksCount === 0} />} />
          ))}
        </ul>
      )}
    </div>
  )
}
