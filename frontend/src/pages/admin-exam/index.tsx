import { Navigate, useParams } from 'react-router-dom'
import { AdminExamEditor } from '@/widgets/admin-exam-editor'

export function AdminExamPage() {
  const id = Number(useParams().examId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/admin" replace />
  return <AdminExamEditor examId={id} />
}
