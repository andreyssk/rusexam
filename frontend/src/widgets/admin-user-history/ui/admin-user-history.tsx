import { Link } from 'react-router-dom'
import { formatDate } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { AttemptHistoryList, useUserHistory } from '@/entities/attempt'

/** One user's history, as the admin sees it: the same list the user has, with each finished attempt opening its result. */
export function AdminUserHistory({ userId }: { userId: number }) {
  const { t, lang } = useI18n()
  const { data, isPending, error } = useUserHistory(userId)

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

  const { user, attempts } = data
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/users">← {t('users.backToUsers')}</Link>
      </Button>

      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold">
          <span className="truncate">{t('users.historyOf', { name: user.username })}</span>
          {user.blocked && <Badge className="bg-danger-soft text-destructive">{t('users.blocked')}</Badge>}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('users.registered', { date: formatDate(user.createdAt, lang) })} · {t('users.completed', { n: user.completedAttempts })}
        </p>
      </div>

      {attempts.length === 0 && <p className="text-muted-foreground">{t('users.historyEmpty')}</p>}
      <AttemptHistoryList
        attempts={attempts}
        // An unfinished attempt belongs to the user and cannot be continued from here, so it has no button.
        linkFor={(a) => (a.status === 'completed' ? { to: `/admin/attempts/${a.id}`, label: t('history.view') } : null)}
      />
    </div>
  )
}
