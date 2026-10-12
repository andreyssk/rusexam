import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { groupExams, useCategories } from '@/entities/category'
import { CourseGate } from '@/entities/course'
import { useExams } from '@/entities/exam'
import { ExamForm, useCreateExam, useDeleteExam } from '@/features/manage-exams'

function Exams({ courseId }: { courseId: number }) {
  const { t, pick } = useI18n()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const exams = useExams()
  const categories = useCategories(courseId)
  const create = useCreateExam()
  const del = useDeleteExam()
  const [creating, setCreating] = useState(false)

  if (exams.isPending || categories.isPending) return <Loading />
  if (exams.error || categories.error) return <ErrorMessage error={exams.error ?? categories.error} />

  const groups = groupExams(categories.data, exams.data)
  const headed = groups.some((g) => g.category)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t('admin.exams')}</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> {t('admin.newExam')}
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardContent className="pt-5">
            <ExamForm
              courseId={courseId}
              submitLabel={t('admin.create')}
              pending={create.isPending}
              onCancel={() => setCreating(false)}
              onSubmit={(v) => create.mutate({ ...v, courseId }, { onSuccess: (exam) => navigate(`/admin/exams/${exam.id}`) })}
            />
          </CardContent>
        </Card>
      )}

      {groups.map((g) => (
        <section key={g.category?.id ?? 'other'} className="space-y-3">
          {headed && (
            <h2 className="px-1 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {g.category ? pick(g.category.titleRu, g.category.titleEn) : t('category.uncategorized')}
            </h2>
          )}
          <ul className="space-y-3">
            {g.exams.map((exam) => (
              <li key={exam.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/exams/${exam.id}`} className="font-extrabold hover:underline">
                        {pick(exam.titleRu, exam.titleEn)}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {t('exam.tasks', { n: exam.tasksCount })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/exams/${exam.id}`}>{t('admin.edit')}</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      loading={del.isPending && del.variables === exam.id}
                      disabled={del.isPending}
                      onClick={async () => (await confirm({ message: t('admin.deleteExamConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) && del.mutate(exam.id)}
                    >
                      {t('admin.delete')}
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** The exams of the course selected in the sidebar, under their categories. */
export function AdminExamList() {
  return <CourseGate>{(course) => <Exams courseId={course.id} />}</CourseGate>
}
