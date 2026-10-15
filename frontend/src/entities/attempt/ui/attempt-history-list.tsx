import { Link } from 'react-router-dom'
import type { Attempt } from '@/shared/api'
import { formatDate, formatDuration, formatPercent } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'

type Props = {
  attempts: Attempt[]
  /** Where an attempt's button leads and what it says; null = no button (e.g. an admin cannot continue someone else's attempt). */
  linkFor: (a: Attempt) => { to: string; label: string } | null
}

/** A list of attempts: lesson, mode, date, time and score. Shared by a learner's History and the admin's view of it. */
export function AttemptHistoryList({ attempts, linkFor }: Props) {
  const { t, lang, pick } = useI18n()
  return (
    <ul className="space-y-2">
      {attempts.map((a) => {
        const done = a.status === 'completed'
        const link = linkFor(a)
        return (
          <li key={a.id}>
            <Card>
              <CardContent className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-snug">{pick(a.lessonTitleRu, a.lessonTitleEn)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(`mode.${a.mode}`)} · {formatDate(a.startedAt, lang)}
                    {done && a.durationSeconds != null && ` · ${formatDuration(a.durationSeconds)}`}
                  </p>
                </div>
                {done ? (
                  <span className="text-base font-extrabold tabular-nums">{formatPercent(a.scorePercent)}</span>
                ) : (
                  <Badge className="bg-accent-soft text-accent">{t('history.inProgress')}</Badge>
                )}
                {link && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={link.to}>{link.label}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
