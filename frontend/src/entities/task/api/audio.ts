import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, unwrap } from '@/shared/api'

/** The task's mp3 as an object URL (fetched with the session's token, since an <audio src> cannot send it). */
export function useTaskAudioUrl(taskId: number, enabled = true) {
  const query = useQuery({
    queryKey: ['task-audio', taskId],
    queryFn: () => unwrap(api.GET('/tasks/{taskID}/audio', { params: { path: { taskID: taskId } }, parseAs: 'blob' })),
    enabled,
    staleTime: Infinity,
  })
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!query.data) return setUrl(null)
    const u = URL.createObjectURL(query.data)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [query.data])
  return { url, isPending: query.isPending, error: query.error }
}
