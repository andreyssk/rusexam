import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'
import { useCurrentCourse } from '@/entities/course'
import { useAuth } from '@/entities/user'

/** The lessons of the selected course. */
export function useLessons() {
  const { user } = useAuth()
  const { course } = useCurrentCourse()
  const courseId = course?.id
  return useQuery({
    queryKey: ['lessons', user?.id ?? 'anon', courseId],
    queryFn: () => unwrap(api.GET('/lessons', { params: { query: { courseId } } })),
    enabled: courseId !== undefined,
  })
}

export function useLesson(id: number) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: () => unwrap(api.GET('/lessons/{lessonID}', { params: { path: { lessonID: id } } })),
  })
}
