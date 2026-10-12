import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} aria-hidden="true" className={cn('animate-spin', className)} />
}
