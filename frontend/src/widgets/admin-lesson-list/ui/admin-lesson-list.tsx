import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { groupLessons, useCategories } from '@/entities/category'
import { CourseGate } from '@/entities/course'
import { LessonStatusBadge, useLessons } from '@/entities/lesson'
import { LessonForm, LessonStatusButton, useCreateLesson, useDeleteLesson } from '@/features/manage-lessons'

function Lessons({ courseId }: { courseId: number }) {
  const { t, pick } = useI18n()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const lessons = useLessons()
  const categories = useCategories(courseId)
  const create = useCreateLesson()
  const del = useDeleteLesson()
  const [creating, setCreating] = useState(false)
  // '' = all categories, 'none' = lessons without a category, otherwise a category id.
  const [categoryFilter, setCategoryFilter] = useState('')

  if (lessons.isPending || categories.isPending) return <Loading />
  if (lessons.error || categories.error) return <ErrorMessage error={lessons.error ?? categories.error} />

  const shown = lessons.data.filter((e) =>
    categoryFilter === '' ? true : categoryFilter === 'none' ? e.categoryId == null : e.categoryId === Number(categoryFilter),
  )
  const groups = groupLessons(categories.data, shown)
  const headed = groups.some((g) => g.category)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t('admin.lessons')}</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> {t('admin.newLesson')}
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardContent className="pt-5">
            <LessonForm
              courseId={courseId}
              submitLabel={t('admin.create')}
              pending={create.isPending}
              onCancel={() => setCreating(false)}
              onSubmit={(v) => create.mutate({ ...v, courseId }, { onSuccess: (lesson) => navigate(`/admin/lessons/${lesson.id}`) })}
            />
          </CardContent>
        </Card>
      )}

      {categories.data.length > 0 && (
        <div role="group" aria-label={t('category.label')} className="flex flex-wrap gap-2">
          {[
            { value: '', label: t('category.all') },
            ...categories.data.map((c) => ({ value: String(c.id), label: pick(c.titleRu, c.titleEn) })),
            { value: 'none', label: t('category.none') },
          ].map((chip) => (
            <button
              key={chip.value}
              type="button"
              aria-pressed={categoryFilter === chip.value}
              onClick={() => setCategoryFilter(chip.value)}
              className={cn(
                'cursor-pointer rounded-full border-2 px-3.5 py-1 text-sm font-bold transition-colors',
                categoryFilter === chip.value ? 'border-accent bg-accent-soft text-accent' : 'bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && <p className="py-6 text-center text-muted-foreground">{t('home.empty')}</p>}

      {groups.map((g) => (
        <section key={g.category?.id ?? 'other'} className="space-y-3">
          {headed && (
            <h2 className="px-1 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {g.category ? pick(g.category.titleRu, g.category.titleEn) : t('category.uncategorized')}
            </h2>
          )}
          <ul className="space-y-3">
            {g.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/lessons/${lesson.id}`} className="font-extrabold hover:underline">
                        {pick(lesson.titleRu, lesson.titleEn)}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <LessonStatusBadge status={lesson.status} />
                        {t('lesson.tasks', { n: lesson.tasksCount })}
                      </p>
                    </div>
                    <LessonStatusButton lesson={lesson} />
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/lessons/${lesson.id}`}>{t('admin.edit')}</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      loading={del.isPending && del.variables === lesson.id}
                      disabled={del.isPending}
                      onClick={async () => (await confirm({ message: t('admin.deleteLessonConfirm'), confirmLabel: t('admin.confirmDelete'), destructive: true })) && del.mutate(lesson.id)}
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

/** The lessons of the course selected in the sidebar, under their categories. */
export function AdminLessonList() {
  return <CourseGate>{(course) => <Lessons courseId={course.id} />}</CourseGate>
}
