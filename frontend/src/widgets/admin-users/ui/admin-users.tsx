import { Copy, History, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminUser } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { formatDate } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Spinner } from '@/shared/ui/spinner'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useToast } from '@/shared/ui/toast'
import { useSettings } from '@/entities/app-settings'
import { useResetPassword, useSetBlocked, useUpdateSignups, useUsers } from '@/features/manage-users'

function SignupsToggle() {
  const { t } = useI18n()
  const settings = useSettings()
  const update = useUpdateSignups()
  const on = settings.data?.allowSignups ?? true
  // While saving, show the value being saved so the switch does not flicker back.
  const shown = update.isPending ? (update.variables ?? on) : on

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="min-w-0 flex-1">
          <p id="signups-label" className="font-extrabold">{t('users.allowSignups')}</p>
          <p id="signups-hint" className="text-sm text-muted-foreground">{t('users.allowSignupsHint')}</p>
        </div>
        {update.isPending && <Spinner className="text-muted-foreground" />}
        <button
          type="button"
          role="switch"
          aria-checked={shown}
          aria-labelledby="signups-label"
          aria-describedby="signups-hint"
          disabled={settings.isPending || update.isPending}
          onClick={() => update.mutate(!on)}
          className={cn(
            'relative h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait',
            shown ? 'border-primary-edge bg-primary' : 'bg-border',
          )}
        >
          <span className={cn('absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', shown && 'translate-x-6')} />
        </button>
      </CardContent>
    </Card>
  )
}

function TempPassword({ name, password, onDone }: { name: string; password: string; onDone: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      toast.success(t('toast.copied'))
    } catch {
      /* clipboard can be blocked; the password is selectable on screen */
    }
  }
  return (
    <Card className="border-accent bg-accent-soft">
      <CardContent className="space-y-3 py-4">
        <p className="font-extrabold">{t('users.tempTitle', { name })}</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="select-all rounded-xl border-2 bg-card px-3 py-2 text-lg font-extrabold tracking-wider">{password}</code>
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy size={14} /> {t('users.copy')}
          </Button>
          <Button size="sm" onClick={onDone}>
            {t('users.dismiss')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('users.tempHint')}</p>
      </CardContent>
    </Card>
  )
}

export function AdminUsers() {
  const { t, lang } = useI18n()
  const confirm = useConfirm()
  const { data, isPending, error } = useUsers()
  const block = useSetBlocked()
  const reset = useResetPassword()
  const [temp, setTemp] = useState<{ name: string; password: string } | null>(null)

  const onReset = async (u: AdminUser) => {
    if (!(await confirm({ message: t('users.resetConfirm', { name: u.username }), confirmLabel: t('users.reset') }))) return
    reset.mutate(u.id, { onSuccess: (r) => setTemp({ name: u.username, password: r.temporaryPassword }) })
  }
  const onToggleBlock = async (u: AdminUser) => {
    if (!u.blocked && !(await confirm({ message: t('users.blockConfirm', { name: u.username }), confirmLabel: t('users.block'), destructive: true }))) return
    block.mutate({ id: u.id, blocked: !u.blocked })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t('users.title')}</h1>
      <SignupsToggle />

      {temp && <TempPassword name={temp.name} password={temp.password} onDone={() => setTemp(null)} />}

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">{t('users.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {data.map((u) => {
            const isAdmin = u.role === 'admin'
            return (
              <li key={u.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="flex flex-wrap items-center gap-2 font-extrabold">
                        <span className="truncate">{u.username}</span>
                        {isAdmin && <Badge className="bg-accent-soft text-accent">{t('users.admin')}</Badge>}
                        {u.blocked && <Badge className="bg-danger-soft text-destructive">{t('users.blocked')}</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('users.registered', { date: formatDate(u.createdAt, lang) })} · {t('users.completed', { n: u.completedAttempts })}
                      </p>
                    </div>
                    {!isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/users/${u.id}`}>
                            <History size={14} /> {t('users.history')}
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          loading={reset.isPending && reset.variables === u.id}
                          disabled={reset.isPending}
                          onClick={() => onReset(u)}
                        >
                          <KeyRound size={14} /> {t('users.reset')}
                        </Button>
                        <Button
                          variant={u.blocked ? 'default' : 'destructive'}
                          size="sm"
                          loading={block.isPending && block.variables?.id === u.id}
                          disabled={block.isPending}
                          onClick={() => onToggleBlock(u)}
                        >
                          {u.blocked ? t('users.unblock') : t('users.block')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
