import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'

/** The categories of one course. */
export function useCategories(courseId: number | undefined) {
  return useQuery({
    queryKey: ['categories', courseId],
    queryFn: () => unwrap(api.GET('/categories', { params: { query: { courseId } } })),
    enabled: courseId !== undefined,
  })
}
