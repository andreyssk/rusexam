import type { User } from './types'

/**
 * In-memory auth session. The access token is never written to storage; the browser keeps the
 * long-lived refresh token in an HttpOnly cookie that scripts cannot read. On page load the session
 * is restored with a silent refresh.
 */
export type SessionState = {
  status: 'loading' | 'authed' | 'anon'
  user: User | null
  token: string | null
}

let state: SessionState = { status: 'loading', user: null, token: null }
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

function set(next: SessionState) {
  state = next
  listeners.forEach((l) => l())
}

export const session = {
  getState: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

function tokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

const REFRESH_MARGIN_MS = 60_000

function scheduleRefresh(token: string) {
  clearTimeout(timer)
  const exp = tokenExpiryMs(token)
  if (!exp) return
  // Refresh a minute before expiry (but never in a tight loop for very short-lived tokens).
  const delay = Math.max(exp - Date.now() - REFRESH_MARGIN_MS, 1_000)
  timer = setTimeout(() => void refreshSession(), delay)
}

export function setSession(token: string, user: User) {
  set({ status: 'authed', user, token })
  scheduleRefresh(token)
}

export function clearSession() {
  clearTimeout(timer)
  set({ status: 'anon', user: null, token: null })
}

let inflight: Promise<boolean> | null = null

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  inflight ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as { token: string; user: User }
        setSession(data.token, data.user)
        return true
      }
      if (res.status === 401) clearSession()
      else if (state.status === 'loading') clearSession()
      return false
    })
    .catch(() => {
      // Network trouble: keep the current session and try again shortly instead of logging out.
      if (state.status === 'loading') clearSession()
      else if (state.token) {
        clearTimeout(timer)
        timer = setTimeout(() => void refreshSession(), 10_000)
      }
      return false
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export async function logoutSession() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    /* the cookie expires on its own; still sign out locally */
  }
  clearSession()
}

// A sleeping laptop or background tab can miss the timer: re-check when the tab becomes visible again.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || state.status !== 'authed' || !state.token) return
    const exp = tokenExpiryMs(state.token)
    if (exp && exp - Date.now() < REFRESH_MARGIN_MS) void refreshSession()
  })
}
