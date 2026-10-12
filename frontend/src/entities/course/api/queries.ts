import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => unwrap(api.GET('/courses')),
  })
}
