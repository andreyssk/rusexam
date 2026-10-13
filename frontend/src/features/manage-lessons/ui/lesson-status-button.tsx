import type { Lesson } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Button } from '@/shared/ui/button'
import { useSetLessonStatus } from '../api/mutations'

/** Approves a pending lesson, or unpublishes an approved one (after asking). */
export function LessonStatusButton({ lesson, size = 'sm' }: { lesson: Pick<Lesson, 'id' | 'status'>; size?: 'sm' | 'default' }) {
  const { t } = useI18n()
  const confirm = useConfirm()
  const set = useSetLessonStatus()
  const approved = lesson.status === 'approved'
  return (
    <Button
      variant={approved ? 'ghost' : 'default'}
      size={size}
      loading={set.isPending}
      onClick={async () => {
        if (approved && !(await confirm({ message: t('admin.unapproveConfirm'), confirmLabel: t('admin.unapprove') }))) return
        set.mutate({ lessonId: lesson.id, status: approved ? 'pending' : 'approved' })
      }}
    >
      {approved ? t('admin.unapprove') : t('admin.approve')}
    </Button>
  )
}
