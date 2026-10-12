import { useI18n } from '@/shared/lib/i18n'
import { ExamList } from '@/widgets/exam-list'

export function HomePage() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('home.title')}</h1>
        <p className="text-muted-foreground">{t('home.subtitle')}</p>
      </div>
      <ExamList />
    </div>
  )
}
