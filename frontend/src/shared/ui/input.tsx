import { ChevronDown } from 'lucide-react'
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

const field =
  'w-full rounded-2xl border-2 bg-muted px-4 py-2 text-base placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-accent focus-visible:bg-card focus-visible:outline-none disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, 'h-11', className)} {...props} />
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, 'min-h-24', className)} {...props} />
}
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  // Custom caret so it sits a comfortable distance from the border; the select fills the wrapper.
  return (
    <div className={cn('relative', className)}>
      <select className={cn(field, 'h-11 cursor-pointer appearance-none pr-11')} {...props} />
      <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-bold', className)} {...props} />
}
