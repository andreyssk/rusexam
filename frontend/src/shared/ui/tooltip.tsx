import type { ReactNode } from 'react'

/** Wraps a control and shows a small label under it on hover or keyboard focus. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-56 rounded-lg bg-foreground px-2 py-1 text-xs font-bold text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}
