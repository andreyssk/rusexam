import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { useToast } from '@/shared/ui/toast'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useCategories } from '@/entities/category'
import { CourseGate } from '@/entities/course'
import { CategoryForm, useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/features/manage-categories'

function Categories({ courseId }: { courseId: number }) {
  const { t, pick } = useI18n()
  const confirm = useConfirm()
  const toast = useToast()
  const { data, isPending, error } = useCategories(courseId)
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const del = useDeleteCategory()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t('admin.categories')}</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> {t('admin.newCategory')}
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardContent className="pt-5">
            <CategoryForm
              submitLabel={t('admin.create')}
              pending={create.isPending}
              onCancel={() => setCreating(false)}
              onSubmit={(v) => create.mutate({ ...v, courseId }, { onSuccess: () => setCreating(false) })}
            />
          </CardContent>
        </Card>
      )}

      {data.length === 0 && !creating && <p className="py-6 text-center text-muted-foreground">{t('category.empty')}</p>}

      <ul className="space-y-3">
        {data.map((c) => (
          <li key={c.id}>
            <Card>
              <CardContent className="py-4">
                {editingId === c.id ? (
                  <CategoryForm
                    initial={c}
                    submitLabel={t('admin.save')}
                    pending={update.isPending}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(body) => update.mutate({ id: c.id, body }, { onSuccess: () => setEditingId(null) })}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">{pick(c.titleRu, c.titleEn)}</p>
                      <p className="text-sm text-muted-foreground">{t('category.counts', { n: c.examsCount })}</p>
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
                        if (c.examsCount > 0) return toast.error(t('category.deleteBlocked'))
                        if (await confirm({ message: t('category.deleteConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) del.mutate(c.id)
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

/** The categories of the course selected in the sidebar. */
export function AdminCategoryList() {
  return <CourseGate>{(course) => <Categories courseId={course.id} />}</CourseGate>
}
