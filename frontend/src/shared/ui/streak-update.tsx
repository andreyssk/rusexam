import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n, type TKey } from '@/shared/lib/i18n'
import { streakUpdate, usePendingStreakUpdate, type StreakUpdate } from '@/shared/lib/streak-update'
import { Button } from '@/shared/ui/button'

const AUTO_CLOSE_MS = 9000

// The line under the week: the original one plus these, one picked at random for each celebration.
const MESSAGE_COUNT = 20
const pickMessage = (): TKey => {
  const i = Math.floor(Math.random() * (MESSAGE_COUNT + 1))
  return i === MESSAGE_COUNT ? 'streak.update.next' : (`streak.msg.${i}` as TKey)
}

// Embers drifting up around the flame, and confetti raining down; fixed values so every render looks the same.
const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  left: 38 + ((i * 29) % 25),
  size: 4 + ((i * 7) % 6),
  dx: ((i * 41) % 90) - 45,
  delay: 0.9 + (i % 8) * 0.22,
  dur: 2.2 + ((i * 13) % 14) / 10,
}))
const CONFETTI_COLORS = ['#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#ff4b4b', '#ce82ff']
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37 + 7) % 100,
  dx: ((i * 53) % 200) - 100,
  rot: 180 + ((i * 97) % 540),
  delay: 1.3 + (i % 9) * 0.09,
  dur: 2 + ((i * 11) % 12) / 10,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

/** The last seven days ending today, each with its short weekday name and whether it is part of the streak. */
function weekDays(to: number, lang: string) {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'short' })
  const now = new Date()
  return Array.from({ length: 7 }, (_, k) => {
    const back = 6 - k
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
    return { label: fmt.format(d), lit: back < to, today: back === 0 }
  })
}

function Flame() {
  return (
    <svg viewBox="0 0 24 24" className="streak-flame h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="flame-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff4b1f" />
          <stop offset="0.55" stopColor="#ff9600" />
          <stop offset="1" stopColor="#ffd34d" />
        </linearGradient>
        <linearGradient id="flame-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffb300" />
          <stop offset="1" stopColor="#fff3b0" />
        </linearGradient>
      </defs>
      <path
        fill="url(#flame-outer)"
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      />
      <path
        className="streak-flame-core"
        fill="url(#flame-inner)"
        d="M12 21.2c-2.2 0-3.9-1.6-3.9-3.7 0-1.5.9-2.5 1.9-3.4.6.9 1.4 1.4 2.3 1.4.2-1 .1-1.8-.4-2.7 1.7 1.1 4 2.5 4 4.7 0 2.1-1.7 3.7-3.9 3.7z"
      />
    </svg>
  )
}

function Celebration({ from, to }: StreakUpdate) {
  const { t, lang } = useI18n()
  const days = useMemo(() => weekDays(to, lang), [to, lang])
  const unit = new Intl.PluralRules(lang).select(to)
  const [message] = useState(pickMessage)

  useEffect(() => {
    const close = () => streakUpdate.clear()
    const id = window.setTimeout(close, AUTO_CLOSE_MS)
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter') && close()
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('daystreak.label')}
      className="streak-screen fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      onClick={() => streakUpdate.clear()}
    >
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="confetti-piece absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: `${p.left}%`, background: p.color, '--dx': `${p.dx}px`, '--rot': `${p.rot}deg`, '--delay': `${p.delay}s`, '--dur': `${p.dur}s` } as React.CSSProperties}
        />
      ))}

      <div className="relative flex flex-col items-center">
        <div className="streak-glow" aria-hidden="true" />
        <div className="relative h-36 w-36 sm:h-44 sm:w-44">
          {EMBERS.map((e, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="streak-ember absolute bottom-1/3 rounded-full"
              style={{ left: `${e.left}%`, width: e.size, height: e.size, '--dx': `${e.dx}px`, '--delay': `${e.delay}s`, '--dur': `${e.dur}s` } as React.CSSProperties}
            />
          ))}
          <Flame />
        </div>

        {/* The number rolls from the old streak to the new one. */}
        <div className="streak-number-window mt-2 h-[1em] overflow-hidden text-[6.5rem] font-extrabold leading-none text-white sm:text-[8rem]" aria-label={String(to)}>
          <div className="streak-number-roll tabular-nums" aria-hidden="true">
            <div className="h-[1em]">{from}</div>
            <div className="h-[1em]">{to}</div>
          </div>
        </div>
        <p className="streak-rise mt-1 text-2xl font-extrabold uppercase tracking-wide text-[#ffc800]" style={{ '--delay': '1.5s' } as React.CSSProperties}>
          {t(`streak.unit.${unit}` as TKey)}
        </p>
      </div>

      <div className="streak-rise mt-8 flex gap-2 sm:gap-3" style={{ '--delay': '1.8s' } as React.CSSProperties} aria-hidden="true">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold uppercase text-white/60">{d.label}</span>
            <span
              className={`streak-dot flex size-9 items-center justify-center rounded-full border-2 sm:size-11 ${
                d.lit ? 'border-[#ff9600] bg-[#ff9600] text-white' : 'border-white/25 text-transparent'
              } ${d.today ? 'streak-dot-today' : ''}`}
              style={{ '--delay': `${2 + i * 0.1}s` } as React.CSSProperties}
            >
              {d.lit && <Check size={20} strokeWidth={4} />}
            </span>
          </div>
        ))}
      </div>

      <p className="streak-rise mt-6 max-w-sm whitespace-pre-line text-lg font-bold text-white/90" style={{ '--delay': '2.9s' } as React.CSSProperties}>
        {to <= 1 ? t('streak.update.first') : t(message)}
      </p>

      <div className="streak-rise mt-8 w-full max-w-xs" style={{ '--delay': '3.2s' } as React.CSSProperties}>
        <Button className="h-12 w-full text-base" onClick={() => streakUpdate.clear()}>
          {t('run.continue')}
        </Button>
      </div>
    </div>
  )
}

/** Plays the streak celebration, full screen, when one has been queued. Mount it once, high in the tree. */
export function StreakUpdateOverlay() {
  const pending = usePendingStreakUpdate()
  return pending ? <Celebration from={pending.from} to={pending.to} /> : null
}
