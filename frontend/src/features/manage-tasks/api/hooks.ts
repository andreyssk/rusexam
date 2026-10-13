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

export function useExamTasks(examId: number) {
  return useQuery({
    queryKey: ['admin-exam-tasks', examId],
    queryFn: () => unwrap(api.GET('/admin/exams/{examID}/tasks', { params: { path: { examID: examId } } })),
  })
}

// ---- writes ----

/** What to do with a task's audio when saving it: upload an mp3, or remove the current one. Absent = leave as is. */
export type AudioChange = { file: File } | { remove: true } | undefined

async function applyAudio(taskId: number, audio: AudioChange) {
  if (!audio) return
  if ('remove' in audio) {
    await unwrap(api.DELETE('/admin/tasks/{taskID}/audio', { params: { path: { taskID: taskId } } }))
    return
  }
  await unwrap(
    api.PUT('/admin/tasks/{taskID}/audio', {
      params: { path: { taskID: taskId } },
      // The raw file is the body; skip the default JSON serialization.
      body: audio.file as unknown as string,
      bodySerializer: (b: unknown) => b as BodyInit,
      headers: { 'Content-Type': 'audio/mpeg' },
    }),
  )
}

const createTask = (body: TaskInput & { courseId: number }) => unwrap(api.POST('/admin/tasks', { body }))
const setExamTasks = (examId: number, taskIds: number[]) =>
  unwrap(api.PUT('/admin/exams/{examID}/tasks', { params: { path: { examID: examId } }, body: { taskIds } }))

function useWriteHelpers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return {
    refresh: () => {
      void qc.invalidateQueries({ queryKey: ['task-audio'] })
      void qc.invalidateQueries({ queryKey: ['admin-bank'] })
      void qc.invalidateQueries({ queryKey: ['admin-exam-tasks'] })
      void qc.invalidateQueries({ queryKey: ['exams'] })
      void qc.invalidateQueries({ queryKey: ['exam'] })
    },
    ok: (key: TKey) => toast.success(t(key)),
    fail: (e: unknown) => toast.error(errorText(e)),
  }
}

export function useCreateTask() {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: async ({ body, audio }: { body: TaskInput & { courseId: number }; audio?: AudioChange }) => {
      const task = await createTask(body)
      await applyAudio(task.id, audio)
      return task
    },
    onSuccess: () => {
      h.refresh()
      h.ok('toast.taskCreated')
    },
    onError: h.fail,
  })
}

/** Creates a task in the bank and appends it to the exam in one go. */
export function useCreateAndLinkTask(examId: number) {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: async ({ body, currentIds, audio }: { body: TaskInput & { courseId: number }; currentIds: number[]; audio?: AudioChange }) => {
      const task = await createTask(body)
      await applyAudio(task.id, audio)
      await setExamTasks(examId, [...currentIds, task.id])
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
    mutationFn: async ({ id, body, audio }: { id: number; body: TaskInput; audio?: AudioChange }) => {
      const task = await unwrap(api.PUT('/admin/tasks/{taskID}', { params: { path: { taskID: id } }, body }))
      await applyAudio(id, audio)
      return task
    },
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

/** Replaces the exam's task list (link, unlink and reorder are all just a new ordered list). */
export function useSetExamTasks(examId: number) {
  const h = useWriteHelpers()
  return useMutation({
    mutationFn: (taskIds: number[]) => setExamTasks(examId, taskIds),
    onSuccess: () => {
      h.refresh()
      h.ok('toast.examTasksUpdated')
    },
    onError: h.fail,
  })
}

export type { AdminTask }

export type BulkAction = { action: 'delete' | 'unlink' } | { action: 'link'; examId: number }

/** Delete, unlink from every exam, or link to one exam, for several bank tasks at once. */
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

/** Creates many tasks at once (all or nothing), optionally appending them to an exam. */
export function useImportTasks() {
  const h = useWriteHelpers()
  const toast = useToast()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (v: { courseId: number; tasks: TaskInput[]; examId?: number }) => unwrap(api.POST('/admin/tasks/import', { body: v })),
    onSuccess: (r) => {
      h.refresh()
      toast.success(t('toast.tasksImported', { n: r.created }))
    },
    // Errors are shown inline in the import dialog, where the user can fix the file.
  })
}

/**
 * Downloads tasks as a JSON file that the import dialog accepts: the tasks of one exam (in order) when `examId` is given,
 * otherwise every task of the course (ignoring filters).
 */
export function useExportTasks() {
  const toast = useToast()
  const { t } = useI18n()
  const errorText = useErrorText()
  return useMutation({
    mutationFn: async ({ courseId, examId }: { courseId: number; examId?: number }) => {
      const all = examId
        ? await unwrap(api.GET('/admin/exams/{examID}/tasks', { params: { path: { examID: examId } } }))
        : await unwrap(api.GET('/admin/tasks', { params: { query: { courseId } } }))
      const tasks: TaskInput[] = all.map((x) => ({
        prompt: x.prompt,
        passage: x.passage ?? '',
        options: x.options,
        correctIndex: x.correctIndex ?? 0,
        explanation: x.explanation ?? '',
      }))
      const url = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${examId ? `exam-${examId}` : 'tasks'}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      return tasks.length
    },
    onSuccess: (n) => toast.success(t('toast.tasksExported', { n })),
    onError: (e) => toast.error(errorText(e)),
  })
}
