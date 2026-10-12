import { useErrorText } from '@/shared/lib/error-text'
import { useI18n } from '@/shared/lib/i18n'

export function Loading() {
  const { t } = useI18n()
  return <p className="py-10 text-center text-muted-foreground">{t('common.loading')}</p>
}

export function ErrorMessage({ error, message }: { error?: unknown; message?: string }) {
  const errorText = useErrorText()
  return (
    <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-bold text-destructive">
      {message ?? errorText(error)}
    </p>
  )
}
