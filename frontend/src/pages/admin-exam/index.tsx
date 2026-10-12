import { Navigate, useParams } from 'react-router-dom'
import { AdminTaskEditor } from '@/widgets/admin-task-editor'

export function AdminExamPage() {
  const id = Number(useParams().examId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/admin" replace />
  return <AdminTaskEditor examId={id} />
}
