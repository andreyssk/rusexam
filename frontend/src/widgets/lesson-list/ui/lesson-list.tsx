import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { groupLessons, useCategories } from '@/entities/category'
import { CourseGate } from '@/entities/course'
import { LessonRow, useLessons } from '@/entities/lesson'
import { usePreferences } from '@/entities/user'
import { StartAttempt } from '@/features/start-attempt'

function Lessons({ courseId }: { courseId: number }) {
  const { t, pick } = useI18n()
  const lessons = useLessons()
  const categories = useCategories(courseId)
  // Which categories the user folded is part of their account (0 = the group without a category).
  const { prefs, ready, update } = usePreferences()

  if (lessons.isPending || categories.isPending || !ready) return <Loading />
  if (lessons.error || categories.error) return <ErrorMessage error={lessons.error ?? categories.error} />
  if (lessons.data.length === 0) return <p className="py-10 text-center text-muted-foreground">{t('home.empty')}</p>

  const groups = groupLessons(categories.data, lessons.data)
  // With no categories at all there is nothing to head the list with, and nothing to fold.
  const headed = groups.some((g) => g.category)
  const collapsed = new Set(prefs.collapsedCategories)
  const toggle = (id: number) => {
    const next = new Set(collapsed)
    if (!next.delete(id)) next.add(id)
    update({ collapsedCategories: [...next] })
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const id = g.category?.id ?? 0
        const open = !headed || !collapsed.has(id)
        return (
          <section key={id}>
            {headed && (
              <h2 className="mb-2">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`cat-panel-${id}`}
                  onClick={() => toggle(id)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-1 py-1.5 text-left text-sm font-extrabold uppercase tracking-wide text-muted-foreground hover:bg-muted"
                >
                  <ChevronDown size={18} className={cn('shrink-0 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
                  <span className="min-w-0 truncate">{g.category ? pick(g.category.titleRu, g.category.titleEn) : t('category.uncategorized')}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums" aria-label={t('category.counts', { n: g.lessons.length })}>
                    {g.lessons.length}
                  </span>
                </button>
              </h2>
            )}
            {/* Folds smoothly; `inert` keeps the hidden lessons out of the tab order and away from screen readers. */}
            <div
              id={`cat-panel-${id}`}
              inert={!open}
              className={cn('grid transition-[grid-template-rows] duration-200', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
            >
              <div className="overflow-hidden">
                <ul className="space-y-2 pb-1">
                  {g.lessons.map((lesson) => (
                    <LessonRow key={lesson.id} lesson={lesson} actions={<StartAttempt lessonId={lesson.id} disabled={lesson.tasksCount === 0} />} />
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** The lessons of the course selected in the header, under their categories. */
export function LessonList() {
  return <CourseGate>{(course) => <Lessons courseId={course.id} />}</CourseGate>
}
