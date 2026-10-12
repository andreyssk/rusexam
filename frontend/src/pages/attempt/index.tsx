import { Navigate, useParams } from 'react-router-dom'
import { AttemptRunner } from '@/widgets/attempt-runner'

export function AttemptPage() {
  const id = Number(useParams().attemptId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/" replace />
  return <AttemptRunner attemptId={id} />
}
