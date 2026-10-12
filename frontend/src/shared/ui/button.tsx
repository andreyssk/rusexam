import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { Spinner } from './spinner'

// Chunky Duolingo-style buttons: a solid "edge" under the button that collapses when pressed.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-extrabold uppercase tracking-wide transition-[filter,transform,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_4px_0_var(--primary-edge)] hover:brightness-105 active:translate-y-1 active:shadow-none',
        outline:
          'border-2 bg-card text-accent shadow-[0_4px_0_var(--border)] hover:bg-muted active:translate-y-1 active:shadow-none',
        ghost: 'text-muted-foreground hover:bg-muted',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_4px_0_var(--destructive-edge)] hover:brightness-105 active:translate-y-1 active:shadow-none',
      },
      size: { default: 'h-11 px-5', sm: 'h-9 px-3.5 text-xs', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner and blocks clicks while a request is running. */
    loading?: boolean
  }

export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: Props) {
  const classes = cn(buttonVariants({ variant, size }), className)
  if (asChild) return <Slot className={classes} {...props}>{children}</Slot>
  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}
