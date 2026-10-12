import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Task } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useExam } from '@/entities/exam'
import {
  ExamForm,
  TaskForm,
  useAdminTasks,
  useCreateTask,
  useDeleteExam,
  useDeleteTask,
  useUpdateExam,
  useUpdateTask,
} from '@/features/manage-exams'

type Editing = { kind: 'new' } | { kind: 'edit'; task: Task } | null

export function AdminTaskEditor({ examId }: { examId: number }) {
  const { t, pick } = useI18n()
  const navigate = useNavigate()
  const exam = useExam(examId)
  const tasks = useAdminTasks(examId)
  const updateExam = useUpdateExam(examId)
  const deleteExam = useDeleteExam()
  const createTask = useCreateTask(examId)
  const updateTask = useUpdateTask(examId)
  const deleteTask = useDeleteTask(examId)
  const [editing, setEditing] = useState<Editing>(null)

  if (exam.isPending || tasks.isPending) return <Loading />
  if (exam.error || tasks.error) return <ErrorMessage error={exam.error ?? tasks.error} />

  const close = () => setEditing(null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin">← {t('admin.back')}</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() =>
            window.confirm(t('admin.deleteExamConfirm')) &&
            deleteExam.mutate(examId, { onSuccess: () => navigate('/admin', { replace: true }) })
          }
        >
          {t('admin.delete')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.examSettings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExamForm
            key={exam.dataUpdatedAt}
            initial={exam.data}
            submitLabel={t('admin.save')}
            pending={updateExam.isPending}
            error={updateExam.error}
            onSubmit={(v) => updateExam.mutate(v)}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t('admin.tasks')}</h2>
          {!editing && (
            <Button onClick={() => setEditing({ kind: 'new' })}>
              <Plus size={16} /> {t('admin.addTask')}
            </Button>
          )}
        </div>

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>{editing.kind === 'new' ? t('admin.addTask') : t('admin.editTask')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskForm
                key={editing.kind === 'edit' ? editing.task.id : 'new'}
                initial={editing.kind === 'edit' ? editing.task : undefined}
                pending={createTask.isPending || updateTask.isPending}
                error={createTask.error ?? updateTask.error}
                onCancel={close}
                onSubmit={(body) =>
                  editing.kind === 'new'
                    ? createTask.mutate(body, { onSuccess: close })
                    : updateTask.mutate({ id: editing.task.id, body }, { onSuccess: close })
                }
              />
            </CardContent>
          </Card>
        )}

        {tasks.data.length === 0 && !editing && <p className="text-muted-foreground">{t('admin.noTasks')}</p>}

        <ol className="space-y-2">
          {tasks.data.map((task, i) => (
            <li key={task.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-6 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                  <Badge>{t(`section.${task.section}`)}</Badge>
                  <p lang="ru" className="min-w-0 flex-1 truncate text-sm" title={task.promptRu}>
                    {pick(task.promptRu, task.promptEn)}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setEditing({ kind: 'edit', task })}>
                    {t('admin.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => window.confirm(t('admin.deleteTaskConfirm')) && deleteTask.mutate(task.id)}
                  >
                    {t('admin.delete')}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
        {deleteTask.isError && <ErrorMessage error={deleteTask.error} />}
      </section>
    </div>
  )
}
