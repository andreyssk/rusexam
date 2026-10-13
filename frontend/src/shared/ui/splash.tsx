import { GraduationCap } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/shared/lib/i18n'

/** A full-screen loading splash, for phones where a tiny spinner would be easy to miss. Portalled so no parent can clip it. */
export function LoadingSplash({ className }: { className?: string }) {
  const { t } = useI18n()
  return createPortal(
    <div role="status" aria-live="polite" className={`fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 bg-background ${className ?? ''}`}>
      <span className="flex size-24 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-[0_6px_0_var(--primary-edge)] motion-safe:animate-pulse">
        <GraduationCap size={52} aria-hidden="true" />
      </span>
      <p className="text-lg font-extrabold text-muted-foreground">{t('common.loading')}</p>
    </div>,
    document.body,
  )
}
