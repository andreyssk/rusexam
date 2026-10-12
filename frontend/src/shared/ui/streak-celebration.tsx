import { useEffect } from 'react'
import { useI18n, type TKey } from '@/shared/lib/i18n'

const COLORS = ['bg-primary', 'bg-accent', 'bg-success', 'bg-destructive']
const PIECES = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  dx: ((i * 53) % 160) - 80,
  rot: 180 + ((i * 97) % 540),
  delay: (i % 6) * 0.08,
  dur: 1.6 + ((i * 13) % 10) / 10,
  color: COLORS[i % COLORS.length],
}))

/** A short confetti burst with a message; dismisses itself. Respects prefers-reduced-motion. */
export function StreakCelebration({ streak, message, onDone }: { streak: number; message: TKey; onDone: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    const id = window.setTimeout(onDone, 3000)
    return () => window.clearTimeout(id)
  }, [streak, onDone])

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" role="status">
      {PIECES.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`confetti-piece absolute top-0 h-3 w-2 rounded-sm ${p.color}`}
          style={{ left: `${p.left}%`, '--dx': `${p.dx}px`, '--rot': `${p.rot}deg`, '--delay': `${p.delay}s`, '--dur': `${p.dur}s` } as React.CSSProperties}
        />
      ))}
      <div className="absolute inset-x-0 top-1/3 flex justify-center px-4">
        <p className="streak-card max-w-md rounded-3xl border-2 border-b-4 border-primary bg-card px-6 py-4 text-center text-xl font-extrabold shadow-xl">
          {t(message, { n: streak })}
        </p>
      </div>
    </div>
  )
}
