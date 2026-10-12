import { useI18n } from '@/shared/lib/i18n'
import { ExamList } from '@/widgets/exam-list'

export function HomePage() {
  const { t } = useI18n()
  return (
    <>
      {/* Kept for screen readers and the document outline; not shown visually. */}
      <h1 className="sr-only">{t('home.title')}</h1>
      <ExamList />
    </>
  )
}
