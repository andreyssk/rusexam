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
