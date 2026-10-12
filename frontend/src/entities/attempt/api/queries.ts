import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'
import { useAuth } from '@/entities/user'

export function useAttempt(id: number) {
  return useQuery({
    queryKey: ['attempt', id],
    queryFn: () => unwrap(api.GET('/attempts/{attemptID}', { params: { path: { attemptID: id } } })),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useResult(id: number) {
  return useQuery({
    queryKey: ['result', id],
    queryFn: () => unwrap(api.GET('/attempts/{attemptID}/result', { params: { path: { attemptID: id } } })),
    staleTime: Infinity,
  })
}

export function useMyAttempts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-attempts', user?.id],
    queryFn: () => unwrap(api.GET('/me/attempts')),
    enabled: !!user,
  })
}
