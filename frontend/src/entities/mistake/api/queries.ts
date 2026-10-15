import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'
import { useAuth } from '@/entities/user'

const fetchPage = (limit: number, offset: number) => unwrap(api.GET('/me/mistakes', { params: { query: { limit, offset } } }))

/** One page of the learner's mistakes (desktop, with page numbers). Always refetched on entering the page: new mistakes appear after every lesson. */
export function useMistakesPage(page: number, pageSize: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['mistakes', user?.id, 'page', page, pageSize],
    queryFn: () => fetchPage(pageSize, (page - 1) * pageSize),
    enabled: !!user,
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

/** The mistakes as one growing list (phones, with infinite scroll). */
export function useMistakesInfinite(pageSize: number) {
  const { user } = useAuth()
  return useInfiniteQuery({
    queryKey: ['mistakes', user?.id, 'infinite', pageSize],
    queryFn: ({ pageParam }) => fetchPage(pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0)
      return last.items.length > 0 && loaded < last.total ? loaded : undefined
    },
    enabled: !!user,
    staleTime: 0,
  })
}
