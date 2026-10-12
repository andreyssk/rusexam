import { useI18n } from '@/shared/lib/i18n'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { ExamRow, useExams } from '@/entities/exam'
import { StartAttempt } from '@/features/start-attempt'

export function ExamList() {
  const { t } = useI18n()
  const { data, isPending, error } = useExams()

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  if (data.length === 0) return <p className="py-10 text-center text-muted-foreground">{t('home.empty')}</p>

  return (
    <ul className="space-y-3">
      {data.map((exam) => (
        <ExamRow key={exam.id} exam={exam} actions={<StartAttempt compact examId={exam.id} disabled={exam.tasksCount === 0} />} />
      ))}
    </ul>
  )
}
