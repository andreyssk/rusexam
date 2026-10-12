import { GraduationCap, User as UserIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { LanguageSwitch } from '@/features/switch-language'
import { useAuth } from '@/entities/user'

const link = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted', isActive ? 'bg-muted' : 'text-muted-foreground')

export function Header() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="text-primary" size={22} />
          {t('app.name')}
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <NavLink to="/" end className={link}>
            {t('nav.exams')}
          </NavLink>
          {user && (
            <NavLink to="/history" className={link}>
              {t('nav.history')}
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={link}>
              {t('nav.admin')}
            </NavLink>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitch />
          {user ? (
            <>
              <span
                className="flex max-w-32 items-center gap-1.5 text-sm font-medium sm:max-w-48"
                title={t('auth.signedInAs', { name: user.username })}
              >
                <UserIcon size={16} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{user.username}</span>
              </span>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">{t('nav.login')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
