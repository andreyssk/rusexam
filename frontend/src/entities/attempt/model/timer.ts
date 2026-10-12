import { useEffect, useRef, useState } from 'react'
import { safeStorage } from '@/shared/lib/storage'

const key = (attemptId: number) => `rutest.timer.${attemptId}`

export function clearTimer(attemptId: number) {
  safeStorage.remove(key(attemptId))
}

/**
 * Count-up timer with no limit. Counts only while the tab is visible and survives reloads,
 * so resuming an attempt continues from where the learner left off.
 */
export function useElapsedTimer(attemptId: number, running: boolean) {
  const [seconds, setSeconds] = useState(() => Number(safeStorage.get(key(attemptId))) || 0)
  const ref = useRef(seconds)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      ref.current += 1
      setSeconds(ref.current)
      safeStorage.set(key(attemptId), String(ref.current))
    }, 1000)
    return () => window.clearInterval(id)
  }, [attemptId, running])

  return { seconds, getSeconds: () => ref.current }
}
