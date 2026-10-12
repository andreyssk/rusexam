import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api'

/** Public app settings (currently: whether new users may sign up). */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => unwrap(api.GET('/settings')),
    staleTime: 60_000,
  })
}
