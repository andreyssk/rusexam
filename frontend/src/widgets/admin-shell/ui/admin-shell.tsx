import { BookOpen, FolderTree, Paperclip, GraduationCap, Layers, ListChecks, LogOut, Menu, User as UserIcon, Users, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { CourseSwitch } from '@/features/switch-course'
import { LanguageSwitch } from '@/features/switch-language'
import { ThemeSwitch } from '@/features/switch-theme'
import { useAuth } from '@/entities/user'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; active?: boolean }

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const items: NavItem[] = [
    { to: '/admin', label: t('nav.lessons'), icon: BookOpen, active: pathname === '/admin' || pathname.startsWith('/admin/lessons') },
    { to: '/admin/categories', label: t('nav.categories'), icon: FolderTree },
    { to: '/admin/tasks', label: t('nav.tasks'), icon: ListChecks },
    { to: '/admin/assets', label: t('nav.assets'), icon: Paperclip },
    { to: '/admin/courses', label: t('nav.courses'), icon: Layers },
    { to: '/admin/users', label: t('nav.users'), icon: Users },
  ]

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <GraduationCap size={26} />
          Rusexam
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" aria-label={t('nav.closeMenu')} onClick={onClose}>
            <X size={22} />
          </Button>
        )}
      </div>

      {/* Courses are managed on their own page, so it is the one place where the switch is not needed. */}
      {pathname !== '/admin/courses' && <CourseSwitch wide />}

      <nav aria-label={t('nav.admin')} className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end, active }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-extrabold uppercase tracking-wide',
                (active ?? isActive) ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-muted',
              )
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t-2 pt-4">
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
        {user && (
          <>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <UserIcon size={16} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{user.username}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut size={16} />
              {t('nav.logout')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/** Layout of the admin area: navigation, course, theme, language and account live in a sidebar (a drawer on mobile). */
export function AdminShell() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // Close the drawer after navigating, and on Escape.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto border-r-2 bg-card md:block">
        <Sidebar />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b-2 bg-card px-4 py-2 md:hidden">
          <Button variant="ghost" size="icon" aria-label={t('nav.menu')} aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu size={22} />
          </Button>
          <Link to="/admin" className="flex items-center gap-2 text-lg font-extrabold text-primary">
            <GraduationCap size={26} />
            Rusexam
          </Link>
        </div>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>

      <div className={cn('fixed inset-0 z-50 md:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
        <div
          className={cn('absolute inset-0 bg-black/50 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menu')}
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[80vw] overflow-y-auto border-r-2 bg-card transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <Sidebar onClose={() => setOpen(false)} />
        </div>
      </div>
    </div>
  )
}
