import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Course } from '@/shared/api'
import { safeStorage } from '@/shared/lib/storage'
import { useCourses } from '../api/queries'

const KEY = 'course-id'

type CurrentCourse = {
  courses: Course[]
  /** The selected course; undefined while loading, or when there are no courses at all. */
  course: Course | undefined
  select: (id: number) => void
  isPending: boolean
  error: unknown
}

const Ctx = createContext<CurrentCourse | null>(null)

/** The course the learner (or admin) is working in, picked in the header and remembered across visits. */
export function CurrentCourseProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error } = useCourses()
  const [id, setId] = useState<number | null>(() => Number(safeStorage.get(KEY)) || null)

  const select = useCallback((next: number) => {
    setId(next)
    safeStorage.set(KEY, String(next))
  }, [])

  const value = useMemo<CurrentCourse>(() => {
    const courses = data ?? []
    // A remembered course that no longer exists falls back to the first one.
    const course = courses.find((c) => c.id === id) ?? courses[0]
    return { courses, course, select, isPending, error }
  }, [data, id, select, isPending, error])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCurrentCourse(): CurrentCourse {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCurrentCourse must be used inside CurrentCourseProvider')
  return v
}
