import { CheckCircle2, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'

type Kind = 'success' | 'error'
type Toast = { id: number; kind: Kind; message: string }
type ToastApi = { success: (message: string) => void; error: (message: string) => void }

const Ctx = createContext<ToastApi | null>(null)

const DURATION: Record<Kind, number> = { success: 4000, error: 7000 }
const MAX_VISIBLE = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = ++nextId.current
      setToasts((ts) => [...ts, { id, kind, message }].slice(-MAX_VISIBLE))
      window.setTimeout(() => dismiss(id), DURATION[kind])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-bold shadow-lg',
              toast.kind === 'success'
                ? 'border-success bg-success-soft text-success'
                : 'border-destructive bg-danger-soft text-destructive',
            )}
          >
            {toast.kind === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <XCircle size={20} className="shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t('common.close')}
              className="cursor-pointer rounded-lg p-1 hover:bg-black/10"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast must be used inside ToastProvider')
  return v
}
