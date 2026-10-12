import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from './button'

type Options = {
  message: string
  /** Label of the confirm button; defaults to "Confirm". */
  confirmLabel?: string
  /** Styles the confirm button as destructive. */
  destructive?: boolean
}
type Confirm = (opts: Options) => Promise<boolean>

const Ctx = createContext<Confirm | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [opts, setOpts] = useState<Options | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  const confirm = useCallback<Confirm>((o) => {
    resolver.current?.(false)
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpts(null)
  }, [])

  // A native <dialog> gives focus trapping, Esc handling and an inert page behind it.
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (opts && !d.open) d.showModal()
    if (!opts && d.open) d.close()
  }, [opts])

  const api = useMemo(() => confirm, [confirm])

  return (
    <Ctx.Provider value={api}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="confirm-message"
        onCancel={(e) => {
          e.preventDefault()
          settle(false)
        }}
        onClick={(e) => e.target === dialog.current && settle(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-2 border-b-4 bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
      >
        {opts && (
          <div className="space-y-5 p-6">
            <p id="confirm-message" className="text-base font-bold">
              {opts.message}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => settle(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant={opts.destructive ? 'destructive' : 'default'} autoFocus onClick={() => settle(true)}>
                {opts.confirmLabel ?? t('common.confirm')}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  )
}

/** Promise-based replacement for window.confirm: `if (!(await confirm({ message }))) return`. */
export function useConfirm(): Confirm {
  const v = useContext(Ctx)
  if (!v) throw new Error('useConfirm must be used inside ConfirmProvider')
  return v
}
