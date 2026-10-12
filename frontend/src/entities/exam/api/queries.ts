import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'
import { useCurrentCourse } from '@/entities/course'
import { useAuth } from '@/entities/user'

/** The exams of the selected course. */
export function useExams() {
  const { user } = useAuth()
  const { course } = useCurrentCourse()
  const courseId = course?.id
  return useQuery({
    queryKey: ['exams', user?.id ?? 'anon', courseId],
    queryFn: () => unwrap(api.GET('/exams', { params: { query: { courseId } } })),
    enabled: courseId !== undefined,
  })
}

export function useExam(id: number) {
  return useQuery({
    queryKey: ['exam', id],
    queryFn: () => unwrap(api.GET('/exams/{examID}', { params: { path: { examID: id } } })),
  })
}
