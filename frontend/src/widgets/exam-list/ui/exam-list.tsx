import { useI18n } from '@/shared/lib/i18n'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { groupExams, useCategories } from '@/entities/category'
import { CourseGate } from '@/entities/course'
import { ExamRow, useExams } from '@/entities/exam'
import { StartAttempt } from '@/features/start-attempt'

function Exams({ courseId }: { courseId: number }) {
  const { t, pick } = useI18n()
  const exams = useExams()
  const categories = useCategories(courseId)

  if (exams.isPending || categories.isPending) return <Loading />
  if (exams.error || categories.error) return <ErrorMessage error={exams.error ?? categories.error} />
  if (exams.data.length === 0) return <p className="py-10 text-center text-muted-foreground">{t('home.empty')}</p>

  const groups = groupExams(categories.data, exams.data)
  // With no categories at all there is nothing to head the list with.
  const headed = groups.some((g) => g.category)

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.category?.id ?? 'other'} aria-labelledby={`cat-${g.category?.id ?? 'other'}`}>
          {headed && (
            <h2 id={`cat-${g.category?.id ?? 'other'}`} className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {g.category ? pick(g.category.titleRu, g.category.titleEn) : t('category.uncategorized')}
            </h2>
          )}
          <ul className="space-y-2">
            {g.exams.map((exam) => (
              <ExamRow key={exam.id} exam={exam} actions={<StartAttempt compact examId={exam.id} disabled={exam.tasksCount === 0} />} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** The exams of the course selected in the header, under their categories. */
export function ExamList() {
  return <CourseGate>{(course) => <Exams courseId={course.id} />}</CourseGate>
}
