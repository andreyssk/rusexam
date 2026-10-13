import { useDeferredValue, useState } from 'react'
import { useI18n } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { ErrorMessage, Loading } from '@/shared/ui/states'
import { useBankTasks } from '@/features/manage-tasks'

/** Lists bank tasks that are not yet in the exam, so several can be added at once. */
export function TaskPicker({
  courseId,
  excludeIds,
  pending,
  onAdd,
  onClose,
}: {
  courseId: number
  excludeIds: Set<number>
  pending: boolean
  onAdd: (ids: number[]) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const { data, isPending, error } = useBankTasks({ courseId, q })

  const available = (data ?? []).filter((task) => !excludeIds.has(task.id))
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-48 flex-1"
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorMessage error={error} />
        ) : available.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">{t('admin.pickerEmpty')}</p>
        ) : (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {available.map((task) => (
              <li key={task.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 hover:bg-muted">
                  <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggle(task.id)} className="h-4 w-4 accent-[var(--primary)]" />
                  <span lang="ru" translate="no" className="min-w-0 flex-1 truncate text-sm">
                    {task.prompt}
                  </span>
                  {task.externalId && (
                    <span translate="no" className="shrink-0 text-xs font-bold text-accent">
                      {task.externalId}
                    </span>
                  )}
                  {task.usedIn.length > 0 && <span className="shrink-0 text-xs text-muted-foreground">{t('admin.sharedIn', { n: task.usedIn.length })}</span>}
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Button
            loading={pending}
            disabled={selected.size === 0}
            onClick={() => onAdd([...selected])}
          >
            {t('admin.addSelected', { n: selected.size })}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
