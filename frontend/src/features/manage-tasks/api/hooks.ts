import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type AdminTask, type TaskInput } from '@/shared/api'
import { useErrorText } from '@/shared/lib/error-text'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { useToast } from '@/shared/ui/toast'

// ---- reads ----

/** The task bank of one course, optionally filtered. */
export function useBankTasks(filters: { courseId: number; q: string; unassigned?: boolean }) {
  return useQuery({
    queryKey: ['admin-bank', filters.courseId, filters.q, filters.unassigned],
    queryFn: () =>
      unwrap(
        api.GET('/admin/tasks', {
          params: { query: { courseId: filters.courseId, q: filters.q || undefined, unassigned: filters.unassigned || undefined } },
        }),
      ),
    placeholderData: (prev) => prev,
  })
}

export function useLessonTasks(lessonId: number) {
  return useQuery({
    queryKey: ['admin-lesson-tasks', lessonId],
    queryFn: () => unwrap(api.GET('/admin/lessons/{lessonID}/tasks', { params: { path: { lessonID: lessonId } } })),
  })
}

// ---- writes ----

const createTask = (body: TaskInput & { courseId: number }) => unwrap(api.POST('/admin/tasks', { body }))
const setLessonTasks = (lessonId: number, taskIds: number[]) =>
  unwrap(api.PUT('/admin/lessons/{lessonID}/tasks', { params: { path: { lessonID: lessonId } }, body: { taskIds } }))

function useWriteHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => {
      void qc.invalidateQueries({ queryKey: ['admin-bank'] })
      void qc.invalidateQueries({ queryKey: ['admin-lesson-tasks'] })
      void qc.invalidateQueries({ queryKey: ['lessons'] })
      void qc.invalidateQueries({ queryKey: ['lesson'] })
    },
    ok: (key: TKey) => toast.success(t(key)),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

export function useCreateTask() {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      h.refresh()
      h.ok('toast.taskCreated')
    },
    onError: h.fail,
  })
}

/** Creates a task in the bank and appends it to the lesson in one go. */
export function useCreateAndLinkTask(lessonId: number) {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: async ({ body, currentIds }: { body: TaskInput & { courseId: number }; currentIds: number[] }) => {
      const task = await createTask(body)
      await setLessonTasks(lessonId, [...currentIds, task.id])
      return task
    },
    onSuccess: () => {
      h.refresh()
      h.ok('toast.taskCreatedAdded')
    },
    onError: (e) => {
      h.refresh() // the task may have been created even if linking failed
      h.fail(e)
    },
  })
}

export function useUpdateTask() {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TaskInput }) =>
      unwrap(api.PUT('/admin/tasks/{taskID}', { params: { path: { taskID: id } }, body })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.taskSaved')
    },
    onError: h.fail,
  })
}

export function useDeleteTask() {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: (taskId: number) =>
      unwrap(api.DELETE('/admin/tasks/{taskID}', { params: { path: { taskID: taskId } } })),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.taskDeleted')
    },
    onError: h.fail,
  })
}

/** Replaces the lesson's task list (link, unlink and reorder are all just a new ordered list). */
export function useSetLessonTasks(lessonId: number) {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: (taskIds: number[]) => setLessonTasks(lessonId, taskIds),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.lessonTasksUpdated')
    },
    onError: h.fail,
  })
}

export type { AdminTask }

export type BulkAction = { action: 'delete' | 'unlink' } | { action: 'link'; lessonId: number }

/** Delete, unlink from every lesson, or link to one lesson, for several bank tasks at once. */
export function useBulkTasks() {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: ({ taskIds, ...rest }: { taskIds: number[] } & BulkAction) =>
      unwrap(api.POST('/admin/tasks/bulk', { body: { taskIds, ...rest } })),
    onSuccess: (_, v) => {
      h.refresh()
      h.ok(v.action === 'delete' ? 'toast.tasksDeleted' : v.action === 'unlink' ? 'toast.tasksUnlinked' : 'toast.tasksLinked')
    },
    onError: h.fail,
  })
}

/** Creates many tasks at once (all or nothing), optionally appending them to a lesson. */
export function useImportTasks() {
  const h = useWriteHelpers()
  const toast = useToast()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (v: { courseId: number; tasks: TaskInput[]; lessonId?: number }) => unwrap(api.POST('/admin/tasks/import', { body: v })),
    onSuccess: (r) => {
      h.refresh()
      toast.success(t('toast.tasksImported', { n: r.created }))
    },
    // Errors are shown inline in the import dialog, where the user can fix the file.
  })
}

/**
 * Downloads tasks as a JSON file that the import dialog accepts: the tasks of one lesson (in order) when `lessonId` is given,
 * otherwise every task of the course (ignoring filters).
 */
export function useExportTasks() {
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return useMutation({
    mutationFn: async ({ courseId, lessonId }: { courseId: number; lessonId?: number }) => {
      const all = lessonId
        ? await unwrap(api.GET('/admin/lessons/{lessonID}/tasks', { params: { path: { lessonID: lessonId } } }))
        : await unwrap(api.GET('/admin/tasks', { params: { query: { courseId } } }))
      const tasks: TaskInput[] = all.map((x) => ({
        prompt: x.prompt,
        passage: x.passage ?? '',
        options: x.options,
        correctIndex: x.correctIndex ?? 0,
        explanation: x.explanation ?? '',
        ...(x.externalId ? { externalId: x.externalId } : {}),
      }))
      const url = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${lessonId ? `lesson-${lessonId}` : 'tasks'}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      return tasks.length
    },
    onSuccess: (n) => toast.success(t('toast.tasksExported', { n })),
    onError: (e) => toast.error(errorText(e)),
  })
}
