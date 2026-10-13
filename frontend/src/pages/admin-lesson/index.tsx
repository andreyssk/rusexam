import { Navigate, useParams } from 'react-router-dom'
import { AdminLessonEditor } from '@/widgets/admin-lesson-editor'

export function AdminLessonPage() {
  const id = Number(useParams().lessonId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/admin" replace />
  return <AdminLessonEditor lessonId={id} />
}
