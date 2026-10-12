import { useCallback } from 'react'
import { ApiError } from '@/shared/api'
import { useI18n } from './i18n'

/** Status codes a reverse proxy returns when the API behind it is down. */
const SERVER_DOWN = new Set([0, 502, 503, 504])

/** Turns any error into text for the user; "server is down" gets its own message instead of "Bad Gateway". */
export function useErrorText() {
  const { t } = useI18n()
  return useCallback(
    (e: unknown): string => {
      if (e instanceof ApiError) {
        if (SERVER_DOWN.has(e.status)) return t('error.serverDown')
        // 404/405 on an action means the running server doesn't know this endpoint (usually an outdated build).
        if (e.status === 404 || e.status === 405) return t('error.unsupported')
        return e.message
      }
      return e instanceof Error ? e.message : t('common.error')
    },
    [t],
  )
}
