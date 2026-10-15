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

/** A finished attempt's result. With `admin`, any user's attempt (for the admin's view of their history). */
export function useResult(id: number, admin = false) {
  return useQuery({
    queryKey: [admin ? 'admin-result' : 'result', id],
    queryFn: () =>
      admin
        ? unwrap(api.GET('/admin/attempts/{attemptID}/result', { params: { path: { attemptID: id } } }))
        : unwrap(api.GET('/attempts/{attemptID}/result', { params: { path: { attemptID: id } } })),
    staleTime: Infinity,
  })
}

/** Admin: one user and their attempts. */
export function useUserHistory(userId: number) {
  return useQuery({
    queryKey: ['user-history', userId],
    queryFn: () => unwrap(api.GET('/admin/users/{userID}/attempts', { params: { path: { userID: userId } } })),
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

export function useStreak() {
  const { user } = useAuth()
  // "A day" is the learner's own calendar day, so the browser's time zone is sent along.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return useQuery({
    queryKey: ['streak', user?.id],
    queryFn: () => unwrap(api.GET('/me/streak', { params: { query: { tz } } })),
    enabled: !!user && user.role !== 'admin',
  })
}
