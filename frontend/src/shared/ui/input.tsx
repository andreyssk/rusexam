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
  return <select className={cn(field, 'h-11', className)} {...props} />
}
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-bold', className)} {...props} />
}
