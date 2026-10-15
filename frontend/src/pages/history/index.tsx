import { useI18n } from '@/shared/lib/i18n'
import { PaginatedList } from '@/shared/ui/paginated-list'
import { AttemptHistoryList, useMyAttemptsInfinite, useMyAttemptsPage } from '@/entities/attempt'

/** The learner's whole history: numbered pages on desktop, infinite scroll on phones. */
export function HistoryPage() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">{t('history.title')}</h1>
      <PaginatedList
        usePage={useMyAttemptsPage}
        useInfinite={useMyAttemptsInfinite}
        empty={<p className="text-muted-foreground">{t('history.empty')}</p>}
      >
        {(items) => (
          <AttemptHistoryList
            attempts={items}
            linkFor={(a) =>
              a.status === 'completed'
                ? { to: `/attempts/${a.id}/result`, label: t('history.view') }
                : { to: `/attempts/${a.id}`, label: t('history.continue') }
            }
          />
        )}
      </PaginatedList>
    </div>
  )
}
