import { Download, Plus, Upload } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import type { AdminTask } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Select } from '@/shared/ui/input'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { CourseGate } from '@/entities/course'
import { useExams } from '@/entities/exam'
import { ImportTasksDialog, TaskForm, useBankTasks, useBulkTasks, type BulkAction, useCreateTask, useDeleteTask, useExportTasks, useUpdateTask } from '@/features/manage-tasks'

type Editing = { kind: 'new' } | { kind: 'edit'; task: AdminTask } | null

function TaskBank({ courseId }: { courseId: number }) {
  const { t, pick } = useI18n()
  const confirm = useConfirm()
  const [unassigned, setUnassigned] = useState(false)
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())
  const [editing, setEditing] = useState<Editing>(null)
  const [importing, setImporting] = useState(false)
  const { data, isPending, error } = useBankTasks({ courseId, q, unassigned })
  const create = useCreateTask()
  const update = useUpdateTask()
  const del = useDeleteTask()
  const bulk = useBulkTasks()
  const exportTasks = useExportTasks()
  const exams = useExams()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const ids = [...selected]
  const visibleIds = data?.map((x) => x.id) ?? []
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s)
      if (!n.delete(id)) n.add(id)
      return n
    })
  const run = (a: BulkAction) => bulk.mutate({ taskIds: ids, ...a }, { onSuccess: () => setSelected(new Set()) })
  const close = () => setEditing(null)

  const examName = (e: { titleRu: string; titleEn: string }) => pick(e.titleRu, e.titleEn)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">{t('admin.bankTitle')}</h1>
        {!editing && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}>
              <Upload size={16} /> {t('admin.import')}
            </Button>
            <Button variant="outline" loading={exportTasks.isPending} onClick={() => exportTasks.mutate({ courseId })}>
              <Download size={16} /> {t('admin.export')}
            </Button>
            <Button onClick={() => setEditing({ kind: 'new' })}>
              <Plus size={16} /> {t('admin.newTask')}
            </Button>
          </div>
        )}
      </div>

      <ImportTasksDialog open={importing} onClose={() => setImporting(false)} />

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editing.kind === 'new' ? t('admin.newTask') : t('admin.editTask')}</CardTitle>
            {editing.kind === 'edit' && editing.task.usedIn.length > 1 && (
              <p className="text-sm font-bold text-accent">{t('admin.editSharedNote', { n: editing.task.usedIn.length })}</p>
            )}
          </CardHeader>
          <CardContent>
            <TaskForm
              key={editing.kind === 'edit' ? editing.task.id : 'new'}
              initial={editing.kind === 'edit' ? editing.task : undefined}
              pending={create.isPending || update.isPending}
              onCancel={close}
              onSubmit={(body) =>
                editing.kind === 'new'
                  ? create.mutate({ ...body, courseId }, { onSuccess: close })
                  : update.mutate({ id: editing.task.id, body }, { onSuccess: close })
              }
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Input className="min-w-48 flex-1" placeholder={t('common.search')} aria-label={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 bg-muted px-4 text-sm font-bold">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={unassigned} onChange={(e) => setUnassigned(e.target.checked)} />
          {t('admin.onlyUnassigned')}
        </label>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border-2 bg-card p-3 shadow-lg">
          <span className="mr-auto text-sm font-bold">{t('admin.selectedN', { n: selected.size })}</span>
          <Select
            className="w-auto"
            aria-label={t('admin.linkToExam')}
            value=""
            disabled={bulk.isPending}
            onChange={(e) => e.target.value && run({ action: 'link', examId: Number(e.target.value) })}
          >
            <option value="">{t('admin.linkToExam')}</option>
            {exams.data?.map((x) => (
              <option key={x.id} value={x.id}>
                {examName(x)}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={bulk.isPending}
            onClick={async () => (await confirm({ message: t('admin.unlinkAllConfirm', { n: selected.size }), confirmLabel: t('admin.unlinkAll') })) && run({ action: 'unlink' })}
          >
            {t('admin.unlinkAll')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={bulk.isPending}
            onClick={async () => (await confirm({ message: t('admin.deleteSelectedConfirm', { n: selected.size }), confirmLabel: t('admin.confirmDelete'), destructive: true })) && run({ action: 'delete' })}
          >
            {t('admin.delete')}
          </Button>
          <Button variant="ghost" size="sm" disabled={bulk.isPending} onClick={() => setSelected(new Set())}>
            {t('admin.clearSelection')}
          </Button>
        </div>
      )}

      {data && data.length > 0 && (
        <label className="flex items-center gap-2 px-1 text-sm font-bold">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(visibleIds))}
          />
          {t('admin.selectAll')}
        </label>
      )}

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">{t('admin.bankEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {data.map((task) => (
            <li key={task.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    aria-label={t('admin.selectAll')}
                    checked={selected.has(task.id)}
                    onChange={() => toggle(task.id)}
                  />
                  <div className="min-w-0 flex-1 basis-56">
                    <p lang="ru" translate="no" className="truncate text-sm" title={task.prompt}>
                      {task.prompt}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {task.externalId && (
                        <span translate="no" className="font-bold text-accent">
                          {task.externalId} ·{' '}
                        </span>
                      )}
                      {task.usedIn.length === 0 ? t('admin.notUsed') : t('admin.usedIn', { names: task.usedIn.map(examName).join(', ') })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled={del.isPending} onClick={() => setEditing({ kind: 'edit', task })}>
                    {t('admin.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    loading={del.isPending && del.variables === task.id}
                    disabled={del.isPending}
                    onClick={async () =>
                      (await confirm({
                        message: task.usedIn.length > 0 ? t('admin.deleteTaskUsed', { n: task.usedIn.length }) : t('admin.deleteTaskConfirm'),
                        confirmLabel: t('admin.confirmDelete'),
                        destructive: true,
                      })) && del.mutate(task.id)
                    }
                  >
                    {t('admin.delete')}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The task bank of the course selected in the sidebar. */
export function AdminTaskBank() {
  return <CourseGate>{(course) => <TaskBank courseId={course.id} />}</CourseGate>
}
