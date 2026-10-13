import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { useToast } from '@/shared/ui/toast'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useCourses } from '@/entities/course'
import { CourseForm, useCreateCourse, useDeleteCourse, useUpdateCourse } from '@/features/manage-courses'

export function AdminCourseList() {
  const { t, pick } = useI18n()
  const confirm = useConfirm()
  const toast = useToast()
  const { data, isPending, error } = useCourses()
  const create = useCreateCourse()
  const update = useUpdateCourse()
  const del = useDeleteCourse()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t('admin.courses')}</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> {t('admin.newCourse')}
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardContent className="pt-5">
            <CourseForm
              submitLabel={t('admin.create')}
              pending={create.isPending}
              onCancel={() => setCreating(false)}
              onSubmit={(v) => create.mutate(v, { onSuccess: () => setCreating(false) })}
            />
          </CardContent>
        </Card>
      )}

      {data.length === 0 && !creating && <p className="py-6 text-center text-muted-foreground">{t('course.none')}</p>}

      <ul className="space-y-3">
        {data.map((c) => (
          <li key={c.id}>
            <Card>
              <CardContent className="py-4">
                {editingId === c.id ? (
                  <CourseForm
                    initial={c}
                    submitLabel={t('admin.save')}
                    pending={update.isPending}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(body) => update.mutate({ id: c.id, body }, { onSuccess: () => setEditingId(null) })}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-3xl leading-none" translate="no">{c.flag}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">{pick(c.titleRu, c.titleEn)}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('course.counts', { lessons: c.lessonsCount, tasks: c.tasksCount })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(c.id)}>
                      {t('admin.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      loading={del.isPending && del.variables === c.id}
                      disabled={del.isPending}
                      onClick={async () => {
                        if (c.lessonsCount > 0 || c.tasksCount > 0) return toast.error(t('course.deleteBlocked'))
                        if (await confirm({ message: t('course.deleteConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) del.mutate(c.id)
                      }}
                    >
                      {t('admin.delete')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
