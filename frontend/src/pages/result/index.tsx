import { Navigate, useParams } from 'react-router-dom'
import { ResultSummary } from '@/widgets/result-summary'

export function ResultPage() {
  const id = Number(useParams().attemptId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/" replace />
  return <ResultSummary attemptId={id} />
}
