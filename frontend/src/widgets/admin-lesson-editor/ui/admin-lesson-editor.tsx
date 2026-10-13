import { ArrowDown, ArrowUp, ChevronDown, Download, Library, Plus, Unlink, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdminTask } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { LessonStatusBadge, useLesson } from '@/entities/lesson'
import { LessonForm, LessonStatusButton, useDeleteLesson, useUpdateLesson } from '@/features/manage-lessons'
import {
  ImportTasksDialog,
  TaskForm,
  useCreateAndLinkTask,
  useLessonTasks,
  useExportTasks,
  useSetLessonTasks,
  useUpdateTask,
} from '@/features/manage-tasks'
import { TaskPicker } from './task-picker'

type Panel = { kind: 'picker' } | { kind: 'new' } | { kind: 'edit'; task: AdminTask } | null

export function AdminLessonEditor({ lessonId }: { lessonId: number }) {
  const { t } = useI18n()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const lesson = useLesson(lessonId)
  const tasks = useLessonTasks(lessonId)
  const updateLesson = useUpdateLesson(lessonId)
  const deleteLesson = useDeleteLesson()
  const setTasks = useSetLessonTasks(lessonId)
  const createAndLink = useCreateAndLinkTask(lessonId)
  const updateTask = useUpdateTask()
  const [panel, setPanel] = useState<Panel>(null)
  const exportTasks = useExportTasks()
  const [importing, setImporting] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null)
  // Tasks unfolded to show their answer options and explanation.
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggleOpen = (id: number) =>
    setOpen((s) => {
      const n = new Set(s)
      if (!n.delete(id)) n.add(id)
      return n
    })

  if (lesson.isPending || tasks.isPending) return <Loading />
  if (lesson.error || tasks.error) return <ErrorMessage error={lesson.error ?? tasks.error} />

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
        <div className="ml-auto flex items-center gap-2">
          <LessonStatusBadge status={lesson.data.status} />
          <LessonStatusButton lesson={lesson.data} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          loading={deleteLesson.isPending}
          onClick={async () =>
            (await confirm({ message: t('admin.deleteLessonConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) &&
            deleteLesson.mutate(lessonId, { onSuccess: () => navigate('/admin', { replace: true }) })
          }
        >
          {t('admin.delete')}
        </Button>
      </div>

      {lesson.data.status === 'pending' && <p className="rounded-2xl bg-accent-soft p-3 text-sm font-bold text-accent">{t('admin.pendingHint')}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.lessonSettings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LessonForm
            courseId={lesson.data.courseId}
            key={lesson.dataUpdatedAt}
            initial={lesson.data}
            submitLabel={t('admin.save')}
            pending={updateLesson.isPending}
            onSubmit={(v) => updateLesson.mutate(v)}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">
            {t('admin.lessonTasks')} <span className="text-muted-foreground">({list.length})</span>
          </h2>
          {!panel && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setImporting(true)}>
                <Upload size={16} /> {t('admin.import')}
              </Button>
              <Button
                variant="outline"
                loading={exportTasks.isPending}
                disabled={list.length === 0}
                onClick={() => exportTasks.mutate({ courseId: lesson.data.courseId, lessonId })}
              >
                <Download size={16} /> {t('admin.export')}
              </Button>
              <Button variant="outline" onClick={() => setPanel({ kind: 'picker' })}>
                <Library size={16} /> {t('admin.addFromBank')}
              </Button>
              <Button onClick={() => setPanel({ kind: 'new' })}>
                <Plus size={16} /> {t('admin.newTask')}
              </Button>
            </div>
          )}
        </div>

        <ImportTasksDialog open={importing} onClose={() => setImporting(false)} target={{ lessonId, courseId: lesson.data.courseId }} />

        {panel?.kind === 'picker' && (
          <TaskPicker
            courseId={lesson.data.courseId}
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
                onSubmit={(body) => createAndLink.mutate({ body: { ...body, courseId: lesson.data.courseId }, currentIds: ids }, { onSuccess: close })}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-expanded={open.has(task.id)}
                    aria-label={open.has(task.id) ? t('admin.hideTask') : t('admin.showTask')}
                    title={open.has(task.id) ? t('admin.hideTask') : t('admin.showTask')}
                    onClick={() => toggleOpen(task.id)}
                  >
                    <ChevronDown size={16} className={cn('transition-transform', open.has(task.id) && 'rotate-180')} />
                  </Button>
                  <span className="w-6 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                  <p lang="ru" translate="no" className={cn('min-w-0 flex-1 basis-48 text-sm', !open.has(task.id) && 'truncate')} title={task.prompt}>
                    {task.prompt}
                  </p>
                  {task.externalId && (
                    <Badge className="bg-accent-soft text-accent" translate="no">
                      {task.externalId}
                    </Badge>
                  )}
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
                  {open.has(task.id) && (
                    <div className="basis-full space-y-1.5 border-t-2 pt-3 text-xs">
                      {task.passage && <p lang="ru" translate="no" className="text-muted-foreground">{task.passage}</p>}
                      <ol className="space-y-0.5" lang="ru" translate="no">
                        {task.options.map((opt, oi) => (
                          <li key={oi} className={cn(oi === task.correctIndex ? 'font-bold text-success' : 'text-muted-foreground')}>
                            {'ABCDEFGH'[oi]}. {opt}
                          </li>
                        ))}
                      </ol>
                      {task.explanation && (
                        <p lang="ru" translate="no" className="text-muted-foreground">
                          <span className="font-bold">{t('run.explanation')}: </span>
                          {task.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
