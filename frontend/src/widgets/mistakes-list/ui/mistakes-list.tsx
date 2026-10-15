import { useI18n } from '@/shared/lib/i18n'
import { PaginatedList } from '@/shared/ui/paginated-list'
import { MistakeCard, useMistakesInfinite, useMistakesPage } from '@/entities/mistake'

/** The learner's mistakes, most frequent first: numbered pages on desktop, infinite scroll on phones. */
export function MistakesList() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-extrabold">{t('mistakes.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('mistakes.hint')}</p>
      </div>
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
