import { ArrowDown, ArrowUp, Library, Plus, Unlink } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdminTask } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useExam } from '@/entities/exam'
import { ExamForm, useDeleteExam, useUpdateExam } from '@/features/manage-exams'
import {
  TaskForm,
  useCreateAndLinkTask,
  useExamTasks,
  useSetExamTasks,
  useUpdateTask,
} from '@/features/manage-tasks'
import { TaskPicker } from './task-picker'

type Panel = { kind: 'picker' } | { kind: 'new' } | { kind: 'edit'; task: AdminTask } | null

export function AdminExamEditor({ examId }: { examId: number }) {
  const { t } = useI18n()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const exam = useExam(examId)
  const tasks = useExamTasks(examId)
  const updateExam = useUpdateExam(examId)
  const deleteExam = useDeleteExam()
  const setTasks = useSetExamTasks(examId)
  const createAndLink = useCreateAndLinkTask(examId)
  const updateTask = useUpdateTask()
  const [panel, setPanel] = useState<Panel>(null)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null)

  if (exam.isPending || tasks.isPending) return <Loading />
  if (exam.error || tasks.error) return <ErrorMessage error={exam.error ?? tasks.error} />

  const list = tasks.data
  const ids = list.map((x) => x.id)
  const close = () => setPanel(null)

  const move = (index: number, delta: -1 | 1) => {
    const next = [...ids]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    setTasks.mutate(next)
  }
  const unlink = (id: number) => {
    setUnlinkingId(id)
    setTasks.mutate(
      ids.filter((x) => x !== id),
      { onSettled: () => setUnlinkingId(null) },
    )
  }

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
          loading={deleteExam.isPending}
          onClick={async () =>
            (await confirm({ message: t('admin.deleteExamConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) &&
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
            courseId={exam.data.courseId}
            key={exam.dataUpdatedAt}
            initial={exam.data}
            submitLabel={t('admin.save')}
            pending={updateExam.isPending}
            onSubmit={(v) => updateExam.mutate(v)}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">
            {t('admin.examTasks')} <span className="text-muted-foreground">({list.length})</span>
          </h2>
          {!panel && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPanel({ kind: 'picker' })}>
                <Library size={16} /> {t('admin.addFromBank')}
              </Button>
              <Button onClick={() => setPanel({ kind: 'new' })}>
                <Plus size={16} /> {t('admin.newTask')}
              </Button>
            </div>
          )}
        </div>

        {panel?.kind === 'picker' && (
          <TaskPicker
            courseId={exam.data.courseId}
            excludeIds={new Set(ids)}
            pending={setTasks.isPending}
            onClose={close}
            onAdd={(add) => setTasks.mutate([...ids, ...add], { onSuccess: close })}
          />
        )}

        {panel?.kind === 'new' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.newTask')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskForm
                pending={createAndLink.isPending}
                onCancel={close}
                onSubmit={(body) => createAndLink.mutate({ body: { ...body, courseId: exam.data.courseId }, currentIds: ids }, { onSuccess: close })}
              />
            </CardContent>
          </Card>
        )}

        {panel?.kind === 'edit' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.editTask')}</CardTitle>
              {panel.task.usedIn.length > 1 && (
                <p className="text-sm font-bold text-accent">{t('admin.editSharedNote', { n: panel.task.usedIn.length })}</p>
              )}
            </CardHeader>
            <CardContent>
              <TaskForm
                key={panel.task.id}
                initial={panel.task}
                pending={updateTask.isPending}
                onCancel={close}
                onSubmit={(body) => updateTask.mutate({ id: panel.task.id, body }, { onSuccess: close })}
              />
            </CardContent>
          </Card>
        )}

        {list.length === 0 && !panel && <p className="text-muted-foreground">{t('admin.noTasks')}</p>}

        <ol className="space-y-2">
          {list.map((task, i) => (
            <li key={task.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-6 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                  <Badge>{t(`section.${task.section}`)}</Badge>
                  <p lang="ru" translate="no" className="min-w-0 flex-1 basis-48 truncate text-sm" title={task.prompt}>
                    {task.prompt}
                  </p>
                  {task.usedIn.length > 1 && <Badge className="bg-accent-soft text-accent">{t('admin.sharedIn', { n: task.usedIn.length })}</Badge>}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label={t('admin.moveUp')} title={t('admin.moveUp')} disabled={i === 0 || setTasks.isPending} onClick={() => move(i, -1)}>
                      <ArrowUp size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={t('admin.moveDown')} title={t('admin.moveDown')} disabled={i === list.length - 1 || setTasks.isPending} onClick={() => move(i, 1)}>
                      <ArrowDown size={16} />
                    </Button>
                    <Button variant="outline" size="sm" disabled={setTasks.isPending} onClick={() => setPanel({ kind: 'edit', task })}>
                      {t('admin.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('admin.unlink')}
                      title={`${t('admin.unlink')}. ${t('admin.unlinkHint')}`}
                      loading={unlinkingId === task.id}
                      disabled={setTasks.isPending}
                      onClick={() => unlink(task.id)}
                    >
                      <Unlink size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
