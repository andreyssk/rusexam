import { useI18n } from '@/shared/lib/i18n'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { AttemptHistoryList, useMyAttempts } from '@/entities/attempt'

export function HistoryPage() {
  const { t } = useI18n()
  const { data, isPending, error } = useMyAttempts()

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">{t('history.title')}</h1>
      {data.length === 0 && <p className="text-muted-foreground">{t('history.empty')}</p>}
      <AttemptHistoryList
        attempts={data}
        linkFor={(a) =>
          a.status === 'completed'
            ? { to: `/attempts/${a.id}/result`, label: t('history.view') }
            : { to: `/attempts/${a.id}`, label: t('history.continue') }
        }
      />
    </div>
  )
}
