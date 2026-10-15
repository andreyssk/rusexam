import { Dumbbell } from 'lucide-react'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { PaginatedList } from '@/shared/ui/paginated-list'
import { LoadingSplash } from '@/shared/ui/splash'
import { ErrorMessage } from '@/shared/ui/states'
import { MistakeCard, useMistakesInfinite, useMistakesPage, useMistakesSummary, useStartMistakesPractice } from '@/entities/mistake'

/**
 * Offers to work on the mistakes: a lesson of tasks picked from them, those missed most often more likely.
 * Not shown until there are enough tasks with mistakes to fill it.
 */
function PracticePanel() {
  const { t } = useI18n()
  const summary = useMistakesSummary()
  const start = useStartMistakesPractice()
  if (!summary.data || summary.data.total < summary.data.practiceSize) return null
  const n = summary.data.practiceSize

  return (
    <div className="space-y-2 rounded-2xl border-2 border-b-4 border-accent bg-accent-soft p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-extrabold text-accent">{t('mistakes.practice.title')}</p>
          <p className="text-sm text-muted-foreground">{t('mistakes.practice.hint', { n })}</p>
        </div>
        <Button loading={start.isPending} className="max-sm:w-full" onClick={() => start.mutate()}>
          {!start.isPending && <Dumbbell size={18} />}
          {t('mistakes.practice.button')}
        </Button>
      </div>
      {start.isError && <ErrorMessage error={start.error} />}
      {/* On phones a splash covers the screen while the lesson is being put together. */}
      {start.isPending && <LoadingSplash className="md:hidden" />}
    </div>
  )
}

/** The learner's mistakes, most frequent first: numbered pages on desktop, infinite scroll on phones. */
export function MistakesList() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-extrabold">{t('mistakes.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('mistakes.hint')}</p>
      </div>
      <PracticePanel />

      <PaginatedList
        usePage={useMistakesPage}
        useInfinite={useMistakesInfinite}
        empty={<p className="py-10 text-center text-muted-foreground">{t('mistakes.empty')}</p>}
      >
        {(items) => (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.task.id}>
                <MistakeCard mistake={m} />
              </li>
            ))}
          </ul>
        )}
      </PaginatedList>
    </div>
  )
}
