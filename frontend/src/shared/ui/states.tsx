import { ApiError } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'

export function Loading() {
  const { t } = useI18n()
  return <p className="py-10 text-center text-muted-foreground">{t('common.loading')}</p>
}

export function ErrorMessage({ error, message }: { error?: unknown; message?: string }) {
  const { t } = useI18n()
  const msg =
    message ??
    (error instanceof ApiError && error.status === 0
      ? t('error.network')
      : error instanceof Error
        ? error.message
        : t('common.error'))
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
      {msg}
    </p>
  )
}
