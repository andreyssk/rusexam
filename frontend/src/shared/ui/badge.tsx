import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground', className)}
      {...props}
    />
  )
}
