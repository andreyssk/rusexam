import { cn } from '@/shared/lib/cn'

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-4 w-full overflow-hidden rounded-full bg-border', className)}
    >
      <div
        className="relative h-full rounded-full bg-primary transition-all after:absolute after:inset-x-2 after:top-1 after:h-1 after:rounded-full after:bg-white/35"
        style={{ width: `${v}%` }}
      />
    </div>
  )
}

/** Circular progress with the label centred inside; the ring is empty when `value` is null. */
export function ProgressRing({ value, label, text, size = 56, className }: { value: number | null; label?: string; text: string; size?: number; className?: string }) {
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div
      role="progressbar"
      aria-valuenow={value == null ? undefined : Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="stroke-primary transition-all"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold leading-none tabular-nums">{text}</span>
    </div>
  )
}
