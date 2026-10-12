import { BookOpen, Flame, GraduationCap, History, ListChecks, LogOut, Menu, User as UserIcon, Users, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Tooltip } from '@/shared/ui/tooltip'
import { LanguageSwitch } from '@/features/switch-language'
import { ThemeSwitch } from '@/features/switch-theme'
import { isAttemptRunPath } from '@/shared/lib/routes'
import { useStreak } from '@/entities/attempt'
import { useAuth } from '@/entities/user'

const link = (isActive: boolean) =>
  cn(
    'rounded-xl px-3 py-2 text-sm font-extrabold uppercase tracking-wide',
    isActive ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-muted',
  )

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; active?: boolean }

/** Admins manage exams, the task bank and users; learners take exams and review their history. */
function useNavItems(): NavItem[] {
  const { t } = useI18n()
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (user?.role === 'admin') {
    return [
      { to: '/admin', label: t('nav.exams'), icon: BookOpen, active: pathname === '/admin' || pathname.startsWith('/admin/exams') },
      { to: '/admin/tasks', label: t('nav.tasks'), icon: ListChecks },
      { to: '/admin/users', label: t('nav.users'), icon: Users },
    ]
  }
  return [
    { to: '/', label: t('nav.exams'), icon: BookOpen, end: true },
    ...(user ? [{ to: '/history', label: t('nav.history'), icon: History }] : []),
  ]
}

function NavLinks() {
  return useNavItems().map((item) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => link(item.active ?? isActive)}>
      {item.label}
    </NavLink>
  ))
}

/** Flame with the current day streak: lit once a lesson is finished today, dimmed while today is still open. */
function StreakBadge() {
  const { t } = useI18n()
  const { data } = useStreak()
  if (!data) return null
  const label = data.doneToday
    ? t('daystreak.done', { n: data.current })
    : data.current > 0
      ? t('daystreak.todo', { n: data.current })
      : t('daystreak.start')
  return (
    <Tooltip label={label}>
      <span
        role="img"
        aria-label={`${t('daystreak.label')}: ${data.current}. ${label}`}
        className={cn('flex h-9 items-center gap-1 px-1 text-sm font-extrabold tabular-nums', data.doneToday ? 'text-orange-500' : 'text-muted-foreground')}
      >
        <Flame size={20} fill={data.doneToday ? 'currentColor' : 'none'} />
        {data.current}
      </span>
    </Tooltip>
  )
}

/** Mobile-only tab bar fixed to the bottom of the screen. */
function BottomNav() {
  const { user } = useAuth()
  const items = useNavItems()
  const { pathname } = useLocation()
  // A single tab is pointless (visitors only have the exam list), and a running session has its own action bar.
  if (!user || isAttemptRunPath(pathname)) return null
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t-2 bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map(({ to, label, icon: Icon, end, active }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold uppercase tracking-wide',
              (active ?? isActive) ? 'text-accent' : 'text-muted-foreground',
            )
          }
        >
          <Icon size={22} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Header() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Close the drawer after navigating, and on Escape.
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // The top bar on mobile shows only the icon (the name stays for screen readers); the drawer has room for it.
  const logo = (inDrawer: boolean) => (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-primary">
      <GraduationCap size={26} />
      <span className={inDrawer ? undefined : 'sr-only md:not-sr-only'}>{inDrawer ? 'Rusexam' : t('app.name')}</span>
    </Link>
  )

  return (
    // A running session takes the whole screen on mobile; it has its own X to leave.
    <header className={cn('border-b-2 bg-card', isAttemptRunPath(location.pathname) && 'max-md:hidden')}>
      <div className="mx-auto flex max-w-5xl items-center gap-x-4 px-4 py-3">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.menu')} aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu size={22} />
        </Button>
        {logo(false)}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <StreakBadge />
          <ThemeSwitch />
          <LanguageSwitch />
          {user ? (
            <>
              <span
                className="hidden max-w-48 items-center gap-1.5 text-sm font-bold md:flex"
                title={t('auth.signedInAs', { name: user.username })}
              >
                <UserIcon size={16} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{user.username}</span>
              </span>
              <span className="hidden md:inline-flex">
                <Tooltip label={t('nav.logout')}>
                  <Button variant="outline" size="icon" aria-label={t('nav.logout')} onClick={() => void logout()}>
                    <LogOut size={18} />
                  </Button>
                </Tooltip>
              </span>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">{t('nav.login')}</Link>
            </Button>
          )}
        </div>
      </div>

      <div className={cn('fixed inset-0 z-50 md:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
        <div
          className={cn('absolute inset-0 bg-black/50 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
          onClick={() => setOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menu')}
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col gap-4 border-r-2 bg-card p-4 transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between">
            {logo(true)}
            <Button variant="ghost" size="icon" aria-label={t('nav.closeMenu')} onClick={() => setOpen(false)}>
              <X size={22} />
            </Button>
          </div>
          {user && (
            <div className="mt-auto flex flex-col gap-3 border-t-2 pt-4">
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <UserIcon size={16} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{user.username}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                <LogOut size={16} />
                {t('nav.logout')}
              </Button>
            </div>
          )}
        </aside>
      </div>
      <BottomNav />
    </header>
  )
}
