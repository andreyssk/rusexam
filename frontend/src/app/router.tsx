import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { isAttemptRunPath } from '@/shared/lib/routes'
import { cn } from '@/shared/lib/cn'
import { Loading } from '@/shared/ui/states'
import { StreakUpdateOverlay } from '@/shared/ui/streak-update'
import { AdminShell } from '@/widgets/admin-shell'
import { Header } from '@/widgets/header'
import { useAuth } from '@/entities/user'
import { AdminPage } from '@/pages/admin'
import { AdminAssetsPage } from '@/pages/admin-assets'
import { AdminCategoriesPage } from '@/pages/admin-categories'
import { AdminCoursesPage } from '@/pages/admin-courses'
import { AdminSoundsPage } from '@/pages/admin-sounds'
import { AdminTasksPage } from '@/pages/admin-tasks'
import { AdminAttemptPage } from '@/pages/admin-attempt'
import { AdminUserHistoryPage } from '@/pages/admin-user-history'
import { AdminUsersPage } from '@/pages/admin-users'
import { AdminLessonPage } from '@/pages/admin-lesson'
import { AttemptPage } from '@/pages/attempt'
import { ExamsPage } from '@/pages/exams'
import { HistoryPage } from '@/pages/history'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import { MistakesPage } from '@/pages/mistakes'
import { NotFoundPage } from '@/pages/not-found'
import { ResultPage } from '@/pages/result'
import { SettingsPage } from '@/pages/settings'

function Layout() {
  const { pathname } = useLocation()
  // The tab bar is hidden during a session, so no room is reserved for it.
  const tabBar = !isAttemptRunPath(pathname)
  return (
    <div className="min-h-dvh">
      <Header />
      <StreakUpdateOverlay />
      <main className={cn('mx-auto max-w-5xl px-4 py-6 md:pb-6', tabBar ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'max-md:pt-3')}>
        <Outlet />
      </main>
    </div>
  )
}

/** Gate for a role. Learners take lessons; admins manage content and users, so each is sent to their own area. */
function RequireAuth({ role }: { role: 'learner' | 'admin' }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />
  if (role === 'learner' && user.role === 'admin') return <Navigate to="/admin" replace />
  return <Outlet />
}

/** The learners' home; admins have no lessons to take, so they land in the admin area. */
function Home() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Loading />
  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  return <HomePage />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route element={<RequireAuth role="learner" />}>
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="mistakes" element={<MistakesPage />} />
          <Route path="attempts/:attemptId" element={<AttemptPage />} />
          <Route path="attempts/:attemptId/result" element={<ResultPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<RequireAuth role="admin" />}>
        <Route element={<AdminShell />}>
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/lessons/:lessonId" element={<AdminLessonPage />} />
          <Route path="admin/assets" element={<AdminAssetsPage />} />
          <Route path="admin/sounds" element={<AdminSoundsPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
          <Route path="admin/courses" element={<AdminCoursesPage />} />
          <Route path="admin/tasks" element={<AdminTasksPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/users/:userId" element={<AdminUserHistoryPage />} />
          <Route path="admin/attempts/:attemptId" element={<AdminAttemptPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
