import { Link } from 'react-router-dom'
import { formatDate, formatDuration, formatPercent } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useMyAttempts } from '@/entities/attempt'

export function HistoryPage() {
  const { t, lang, pick } = useI18n()
  const { data, isPending, error } = useMyAttempts()

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('history.title')}</h1>
      {data.length === 0 && <p className="text-muted-foreground">{t('history.empty')}</p>}
      <ul className="space-y-2">
        {data.map((a) => {
          const done = a.status === 'completed'
          return (
            <li key={a.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{pick(a.examTitleRu, a.examTitleEn)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(a.startedAt, lang)}
                      {done && a.durationSeconds != null && ` · ${formatDuration(a.durationSeconds)}`}
                    </p>
                  </div>
                  <Badge>{t(`mode.${a.mode}`)}</Badge>
                  {done ? (
                    <span className="w-14 text-right text-lg font-extrabold tabular-nums">{formatPercent(a.scorePercent)}</span>
                  ) : (
                    <Badge className="bg-accent-soft text-accent">{t('history.inProgress')}</Badge>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link to={done ? `/attempts/${a.id}/result` : `/attempts/${a.id}`}>
                      {done ? t('history.view') : t('history.continue')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
