import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { refreshSession, session } from './session'

const isAuthEndpoint = (url: string) => new URL(url, location.origin).pathname.startsWith('/api/auth/')

// Unconsumed copies of in-flight requests, so a request that fails with 401 can be replayed once.
const replayable = new WeakMap<Request, Request>()

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = session.getState().token
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    if (token && !isAuthEndpoint(request.url)) replayable.set(request, request.clone())
    return request
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return
    const original = replayable.get(request)
    if (!original) return
    replayable.delete(request)
    // The access token expired (or was revoked): get a new one via the refresh cookie and retry once.
    if (!(await refreshSession())) return
    const token = session.getState().token
    if (!token) return
    const retry = new Request(original)
    retry.headers.set('Authorization', `Bearer ${token}`)
    return fetch(retry)
  },
}

export const api = createClient<paths>({ baseUrl: '/api' })
api.use(authMiddleware)

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Res<T> = { data?: T; error?: unknown; response: Response }

/** Turns an openapi-fetch result into a value or a thrown ApiError. */
export async function unwrap<T>(p: Promise<Res<T>>): Promise<T> {
  let res: Res<T>
  try {
    res = await p
  } catch {
    throw new ApiError(0, 'Network error')
  }
  if (!res.response.ok) {
    const msg = (res.error as { error?: string } | undefined)?.error ?? res.response.statusText
    throw new ApiError(res.response.status, msg)
  }
  return res.data as T
}
