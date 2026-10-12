import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/shared/lib/i18n'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useAuth } from '@/entities/user'
import { useCurrentCourse } from '../model/current-course'

/** Renders its children once a course is selected; otherwise a loading, error or "no courses" state. */
export function CourseGate({ children }: { children: (course: NonNullable<ReturnType<typeof useCurrentCourse>['course']>) => ReactNode }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { course, isPending, error } = useCurrentCourse()
  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  if (!course) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        {t('course.none')}{' '}
        {user?.role === 'admin' && (
          <Link to="/admin/courses" className="font-bold text-accent hover:underline">
            {t('course.create')}
          </Link>
        )}
      </p>
    )
  }
  return <>{children(course)}</>
}
