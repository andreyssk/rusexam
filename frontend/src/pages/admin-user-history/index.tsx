import { Navigate, useParams } from 'react-router-dom'
import { AdminUserHistory } from '@/widgets/admin-user-history'

export function AdminUserHistoryPage() {
  const id = Number(useParams().userId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/admin/users" replace />
  return <AdminUserHistory userId={id} />
}
