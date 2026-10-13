import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { api, unwrap, type Preferences } from '@/shared/api'
import { useAuth } from '../model/auth'

const DEFAULTS: Preferences = { audioVolume: 0.5, audioSpeed: 1 }

/**
 * The signed-in user's own settings, stored on their account so they follow them to any device.
 * `update` applies a change at once (the cache is the source of truth for the UI) and saves it shortly after the last change.
 */
export function usePreferences() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const key = ['preferences', user?.id]
  const query = useQuery({
    queryKey: key,
    queryFn: () => unwrap(api.GET('/me/preferences')),
    enabled: !!user,
    staleTime: Infinity,
  })
  const prefs = query.data ?? DEFAULTS

  const timer = useRef<number>(undefined)
  const unsaved = useRef<Preferences | null>(null)
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const body = unsaved.current
    unsaved.current = null
    if (body) void api.PUT('/me/preferences', { body })
  }, [])
  // Leaving the screen (the next task, say) must not drop a change made a moment ago.
  useEffect(() => flush, [flush])

  const update = (patch: Partial<Preferences>) => {
    const next = { ...prefs, ...patch }
    qc.setQueryData(key, next)
    unsaved.current = next
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 400)
  }

  return { prefs, ready: !user || query.isSuccess, update }
}
