import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutSession, refreshSession, session, setSession, type User } from '@/shared/api'

type AuthValue = {
  user: User | null
  /** True until the silent refresh on page load has finished. */
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const s = useSyncExternalStore(session.subscribe, session.getState)

  // Restore the session from the refresh cookie once on startup.
  useEffect(() => {
    void refreshSession()
  }, [])

  // Whenever the signed-in user changes (login, logout, session expiry), reset cached server data.
  const lastUserId = useRef<number | null | undefined>(undefined)
  useEffect(() => {
    if (s.status === 'loading') return
    const id = s.user?.id ?? null
    if (lastUserId.current !== undefined && lastUserId.current !== id) void qc.resetQueries()
    lastUserId.current = id
  }, [s.status, s.user?.id, qc])

  const login = useCallback((token: string, user: User) => setSession(token, user), [])

  const logout = useCallback(async () => {
    await logoutSession()
    navigate('/', { replace: true })
  }, [navigate])

  const value = useMemo<AuthValue>(
    () => ({ user: s.user, isLoading: s.status === 'loading', login, logout }),
    [s.user, s.status, login, logout],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
