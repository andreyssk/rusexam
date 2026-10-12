import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { useCurrentCourse } from '@/entities/course'

/**
 * Dropdown (a centered modal on phones) that shows the selected course as its flag and lets the user switch course.
 * `wide` also shows the course name and fills its container, with the list opening downwards from the left edge (for the admin sidebar).
 */
export function CourseSwitch({ wide }: { wide?: boolean }) {
  const { t, pick } = useI18n()
  const { courses, course, select } = useCurrentCourse()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const modal = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // The phone modal is portalled out of `root`, so presses inside it must not count as outside.
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!root.current?.contains(target) && !modal.current?.contains(target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!course) return null
  const pick_ = (id: number) => {
    select(id)
    setOpen(false)
  }
  const name = pick(course.titleRu, course.titleEn)

  return (
    <div ref={root} className={cn('relative', wide && 'w-full')}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('course.label')}: ${name}`}
        title={name}
        onClick={() => setOpen((o) => !o)}
        className={cn('flex h-9 cursor-pointer items-center gap-0.5 rounded-xl border-2 bg-card px-2 hover:bg-muted', wide && 'w-full gap-2')}
      >
        <span className="text-xl leading-none" translate="no">{course.flag}</span>
        {wide && <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">{name}</span>}
        <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul role="listbox" aria-label={t('course.label')} className={cn('absolute z-50 mt-2 max-h-80 w-60 max-w-[80vw] overflow-y-auto rounded-2xl border-2 bg-card p-1.5 shadow-lg max-md:hidden', wide ? 'left-0' : 'right-0')}>
          {courses.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === course.id}>
              <button type="button" onClick={() => pick_(c.id)} className={cn('flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-muted', c.id === course.id && 'bg-accent-soft text-accent')}>
                <span className="text-xl leading-none" translate="no">{c.flag}</span>
                <span className="min-w-0 flex-1 truncate">{pick(c.titleRu, c.titleEn)}</span>
                {c.id === course.id && <Check size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* On phones the choice is a centered modal. Portalled so a transformed parent (the menu drawer) cannot trap it. */}
      {open &&
        createPortal(
          <div ref={modal} className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('course.label')}
              className="relative max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-3xl border-2 border-b-4 bg-card p-4 shadow-xl"
            >
              <ul className="space-y-2">
                {courses.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={c.id === course.id}
                      onClick={() => pick_(c.id)}
                      className={cn('flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left font-bold', c.id === course.id ? 'border-accent bg-accent-soft text-accent' : 'bg-card active:bg-muted')}
                    >
                      <span className="text-3xl leading-none" translate="no">{c.flag}</span>
                      <span className="min-w-0 flex-1 truncate text-base">{pick(c.titleRu, c.titleEn)}</span>
                      {c.id === course.id && <Check size={20} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
