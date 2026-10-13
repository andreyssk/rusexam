import type { LessonStatus } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/shared/lib/i18n'
import { Badge } from '@/shared/ui/badge'

export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  const { t } = useI18n()
  return (
    <Badge className={cn(status === 'approved' ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent')}>
      {t(`lesson.status.${status}`)}
    </Badge>
  )
}
