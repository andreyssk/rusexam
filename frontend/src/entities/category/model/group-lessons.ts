import type { Category, Lesson } from '@/shared/api'

/** `category` is null for lessons that are in no category. */
export type LessonGroup = { category: Category | null; lessons: Lesson[] }

/** Lessons grouped under their categories in category order; empty categories are dropped and uncategorized lessons come last. */
export function groupLessons(categories: Category[], lessons: Lesson[]): LessonGroup[] {
  const groups: LessonGroup[] = categories
    .map((category) => ({ category, lessons: lessons.filter((e) => e.categoryId === category.id) }))
    .filter((g) => g.lessons.length > 0)
  const known = new Set(categories.map((c) => c.id))
  const rest = lessons.filter((e) => e.categoryId == null || !known.has(e.categoryId))
  if (rest.length > 0) groups.push({ category: null, lessons: rest })
  return groups
}
