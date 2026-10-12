import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Loading } from '@/shared/ui/states'
import { Header } from '@/widgets/header'
import { useAuth } from '@/entities/user'
import { AdminPage } from '@/pages/admin'
import { AdminTasksPage } from '@/pages/admin-tasks'
import { AdminUsersPage } from '@/pages/admin-users'
import { AdminExamPage } from '@/pages/admin-exam'
import { AttemptPage } from '@/pages/attempt'
import { HistoryPage } from '@/pages/history'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { ResultPage } from '@/pages/result'

function Layout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
    </div>
  )
}

/** Gate for a role. Learners take exams; admins manage content and users, so each is sent to their own area. */
function RequireAuth({ role }: { role: 'learner' | 'admin' }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />
  if (role === 'learner' && user.role === 'admin') return <Navigate to="/admin" replace />
  return <Outlet />
}

/** The learners' home; admins have no exams to take, so they land in the admin area. */
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
        <Route element={<RequireAuth role="learner" />}>
          <Route path="history" element={<HistoryPage />} />
          <Route path="attempts/:attemptId" element={<AttemptPage />} />
          <Route path="attempts/:attemptId/result" element={<ResultPage />} />
        </Route>
        <Route element={<RequireAuth role="admin" />}>
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/exams/:examId" element={<AdminExamPage />} />
          <Route path="admin/tasks" element={<AdminTasksPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
