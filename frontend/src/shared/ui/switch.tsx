import { cn } from '@/shared/lib/cn'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Smaller text under the label. */
  hint?: string
  disabled?: boolean
}

/** An on/off switch with its label; the whole row is clickable. */
export function Switch({ checked, onChange, label, hint, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center gap-3 text-left disabled:cursor-default disabled:opacity-50"
    >
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')} aria-hidden="true">
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  )
}
