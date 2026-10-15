import { Navigate, useParams } from 'react-router-dom'
import { ResultSummary } from '@/widgets/result-summary'

/** A user's finished attempt, opened from their history. */
export function AdminAttemptPage() {
  const id = Number(useParams().attemptId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/admin/users" replace />
  return <ResultSummary attemptId={id} admin />
}
