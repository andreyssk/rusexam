import type { Exam } from '@/shared/api'
import { useI18n } from '@/shared/lib/i18n'
import { useConfirm } from '@/shared/ui/confirm'
import { Button } from '@/shared/ui/button'
import { useSetExamStatus } from '../api/mutations'

/** Approves a pending exam, or unpublishes an approved one (after asking). */
export function ExamStatusButton({ exam, size = 'sm' }: { exam: Pick<Exam, 'id' | 'status'>; size?: 'sm' | 'default' }) {
  const { t } = useI18n()
  const confirm = useConfirm()
  const set = useSetExamStatus()
  const approved = exam.status === 'approved'
  return (
    <Button
      variant={approved ? 'ghost' : 'default'}
      size={size}
      loading={set.isPending}
      onClick={async () => {
        if (approved && !(await confirm({ message: t('admin.unapproveConfirm'), confirmLabel: t('admin.unapprove') }))) return
        set.mutate({ examId: exam.id, status: approved ? 'pending' : 'approved' })
      }}
    >
      {approved ? t('admin.unapprove') : t('admin.approve')}
    </Button>
  )
}
