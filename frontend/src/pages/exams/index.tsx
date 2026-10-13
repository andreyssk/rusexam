import { ClipboardCheck } from 'lucide-react'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'

/** Exams are not released yet; this page tells learners what to expect. */
export function ExamsPage() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center md:py-16">
      <span className="flex size-20 items-center justify-center rounded-3xl bg-accent-soft text-accent">
        <ClipboardCheck size={40} aria-hidden="true" />
      </span>
      <Badge className="bg-accent-soft text-accent">{t('exams.soon.badge')}</Badge>
      <h1 className="text-2xl font-extrabold">{t('nav.exams')}</h1>
      <p className="text-base leading-relaxed text-muted-foreground">{t('exams.soon.text')}</p>
    </div>
  )
}
