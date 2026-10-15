import { Link } from 'react-router-dom'
import { formatDate } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { PaginatedList } from '@/shared/ui/paginated-list'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { AttemptHistoryList, useAdminUser, useUserAttemptsInfinite, useUserAttemptsPage } from '@/entities/attempt'

/** One user's whole history, as the admin sees it: the same list the user has, with each finished attempt opening its result. */
export function AdminUserHistory({ userId }: { userId: number }) {
  const { t, lang } = useI18n()
  const { data: user, isPending, error } = useAdminUser(userId)

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

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

      <PaginatedList
        usePage={(page, size) => useUserAttemptsPage(userId, page, size)}
        useInfinite={(size) => useUserAttemptsInfinite(userId, size)}
        empty={<p className="text-muted-foreground">{t('users.historyEmpty')}</p>}
      >
        {(items) => (
          <AttemptHistoryList
            attempts={items}
            // An unfinished attempt belongs to the user and cannot be continued from here, so it has no button.
            linkFor={(a) => (a.status === 'completed' ? { to: `/admin/attempts/${a.id}`, label: t('history.view') } : null)}
          />
        )}
      </PaginatedList>
    </div>
  )
}
