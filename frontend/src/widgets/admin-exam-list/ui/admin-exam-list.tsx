import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useExams } from '@/entities/exam'
import { ExamForm, useCreateExam, useDeleteExam } from '@/features/manage-exams'

export function AdminExamList() {
  const { t, pick } = useI18n()
  const navigate = useNavigate()
  const { data, isPending, error } = useExams()
  const create = useCreateExam()
  const del = useDeleteExam()
  const [creating, setCreating] = useState(false)

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

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
              submitLabel={t('admin.create')}
              pending={create.isPending}
              error={create.error}
              onCancel={() => setCreating(false)}
              onSubmit={(v) =>
                create.mutate(v, {
                  onSuccess: (exam) => navigate(`/admin/exams/${exam.id}`),
                })
              }
            />
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {data.map((exam) => (
          <li key={exam.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/exams/${exam.id}`} className="font-medium hover:underline">
                    {pick(exam.titleRu, exam.titleEn)}
                  </Link>
                  <p className="text-sm text-muted-foreground">{t('exam.tasks', { n: exam.tasksCount })}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/exams/${exam.id}`}>{t('admin.edit')}</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={del.isPending}
                  onClick={() => window.confirm(t('admin.deleteExamConfirm')) && del.mutate(exam.id)}
                >
                  {t('admin.delete')}
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {del.isError && <ErrorMessage error={del.error} />}
    </div>
  )
}
