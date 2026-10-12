import type { Category, Exam } from '@/shared/api'

/** `category` is null for exams that are in no category. */
export type ExamGroup = { category: Category | null; exams: Exam[] }

/** Exams grouped under their categories in category order; empty categories are dropped and uncategorized exams come last. */
export function groupExams(categories: Category[], exams: Exam[]): ExamGroup[] {
  const groups: ExamGroup[] = categories
    .map((category) => ({ category, exams: exams.filter((e) => e.categoryId === category.id) }))
    .filter((g) => g.exams.length > 0)
  const known = new Set(categories.map((c) => c.id))
  const rest = exams.filter((e) => e.categoryId == null || !known.has(e.categoryId))
  if (rest.length > 0) groups.push({ category: null, exams: rest })
  return groups
}
