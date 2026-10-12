import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Loading } from '@/shared/ui/states'
import { Header } from '@/widgets/header'
import { useAuth } from '@/entities/user'
import { AdminPage } from '@/pages/admin'
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
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

function RequireAuth({ admin }: { admin?: boolean }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="history" element={<HistoryPage />} />
          <Route path="attempts/:attemptId" element={<AttemptPage />} />
          <Route path="attempts/:attemptId/result" element={<ResultPage />} />
        </Route>
        <Route element={<RequireAuth admin />}>
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/exams/:examId" element={<AdminExamPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
