import { useSyncExternalStore } from 'react'

/** A pending "your streak grew" celebration: the streak before and after the lesson that was just finished. */
export type StreakUpdate = { from: number; to: number }

let current: StreakUpdate | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** A tiny store, so whoever finishes a lesson can queue the celebration and the screen that is shown next plays it. */
export const streakUpdate = {
  show(from: number, to: number) {
    current = { from, to }
    emit()
  },
  clear() {
    current = null
    emit()
  },
}

export function usePendingStreakUpdate(): StreakUpdate | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}
