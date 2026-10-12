import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'
import { useAuth } from '@/entities/user'

export function useExams() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['exams', user?.id ?? 'anon'],
    queryFn: () => unwrap(api.GET('/exams')),
  })
}

export function useExam(id: number) {
  return useQuery({
    queryKey: ['exam', id],
    queryFn: () => unwrap(api.GET('/exams/{examID}', { params: { path: { examID: id } } })),
  })
}
