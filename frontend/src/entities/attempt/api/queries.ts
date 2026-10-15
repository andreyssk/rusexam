import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
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

const getMyAttempts = (limit: number, offset: number) => unwrap(api.GET('/me/attempts', { params: { query: { limit, offset } } }))
const getUserAttempts = (userId: number, limit: number, offset: number) =>
  unwrap(api.GET('/admin/users/{userID}/attempts', { params: { path: { userID: userId }, query: { limit, offset } } }))

// The history has no cap: pages by number on desktop, one growing list on phones. Always refetched on entering the page.
const nextOffset = (last: { items: unknown[]; total: number }, all: { items: unknown[] }[]) => {
  const loaded = all.reduce((n, p) => n + p.items.length, 0)
  return last.items.length > 0 && loaded < last.total ? loaded : undefined
}

export function useMyAttemptsPage(page: number, pageSize: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-attempts', user?.id, 'page', page, pageSize],
    queryFn: () => getMyAttempts(pageSize, (page - 1) * pageSize),
    enabled: !!user,
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

export function useMyAttemptsInfinite(pageSize: number) {
  const { user } = useAuth()
  return useInfiniteQuery({
    queryKey: ['my-attempts', user?.id, 'infinite', pageSize],
    queryFn: ({ pageParam }) => getMyAttempts(pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    enabled: !!user,
    staleTime: 0,
  })
}

/** Admin: one user (for the header of their history). */
export function useAdminUser(userId: number) {
  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => unwrap(api.GET('/admin/users/{userID}', { params: { path: { userID: userId } } })),
  })
}

/** Admin: a page of one user's attempts. */
export function useUserAttemptsPage(userId: number, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['user-attempts', userId, 'page', page, pageSize],
    queryFn: () => getUserAttempts(userId, pageSize, (page - 1) * pageSize),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

export function useUserAttemptsInfinite(userId: number, pageSize: number) {
  return useInfiniteQuery({
    queryKey: ['user-attempts', userId, 'infinite', pageSize],
    queryFn: ({ pageParam }) => getUserAttempts(userId, pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: 0,
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
