import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { formatDuration } from '@/shared/lib/format'
import { useI18n } from '@/shared/lib/i18n'
import { ErrorMessage } from '@/shared/ui/states'
import { useAssetUrl } from '@/entities/asset'
import { usePreferences } from '@/entities/user'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

// Some phones (iOS) ignore script-set volume and use the hardware buttons instead; a slider there would do nothing.
const volumeSettable = (() => {
  const a = new Audio()
  a.volume = 0.5
  return a.volume === 0.5
})()

/** An audio asset with play/pause, a seek bar and volume. With `autoPlay` it starts by itself (if the browser allows it). */
export function TaskAudio({ assetId, autoPlay }: { assetId: number; autoPlay?: boolean }) {
  const { t } = useI18n()
  const { url, error } = useAssetUrl(assetId)
  const el = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  // Volume and speed are the user's saved preferences, so every task starts with what they last chose.
  const { prefs, update } = usePreferences()
  const volume = prefs.audioVolume
  const speed = prefs.audioSpeed

  useEffect(() => {
    if (el.current) el.current.volume = volume
  }, [volume, url])
  useEffect(() => {
    if (el.current) el.current.playbackRate = speed
  }, [speed, url])

  const toggle = () => {
    const a = el.current
    if (!a) return
    if (a.paused) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(speed)
    update({ audioSpeed: SPEEDS[(i + 1) % SPEEDS.length] })
  }

  const changeVolume = (v: number) => update({ audioVolume: v })

  if (error) return <ErrorMessage error={error} />
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const pct = (v: number, max: number) => `${max > 0 ? Math.min(100, (v / max) * 100) : 0}%`

  return (
    // Play button on the left; to its right the track with the time, and under it the secondary controls (speed, volume).
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5 rounded-2xl border-2 border-b-4 bg-muted px-3 py-2.5">
      {url && (
        <audio
          ref={el}
          src={url}
          preload="auto"
          autoPlay={autoPlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration)
            e.currentTarget.playbackRate = speed
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        />
      )}
      <button
        type="button"
        disabled={!url}
        aria-label={playing ? t('audio.pause') : t('audio.play')}
        onClick={toggle}
        className="row-span-3 flex size-12 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
      >
        {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="translate-x-px" />}
      </button>

      <span className="text-right text-[11px] tabular-nums leading-none text-muted-foreground">
        {formatDuration(Math.floor(time))} / {formatDuration(Math.floor(duration))}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(time, duration || 1)}
        disabled={!url}
        aria-label={t('audio.seek')}
        className="range"
        style={{ '--fill': pct(time, duration) } as CSSProperties}
        onChange={(e) => {
          const v = Number(e.target.value)
          setTime(v)
          if (el.current) el.current.currentTime = v
        }}
      />

      <div className="flex items-center gap-2 text-muted-foreground">
        {volumeSettable && (
          <>
            <button type="button" className="shrink-0 cursor-pointer p-1" aria-label={t('audio.mute')} onClick={() => changeVolume(volume === 0 ? 0.5 : 0)}>
              <VolumeIcon size={18} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              aria-label={t('audio.volume')}
              className="range range-subtle min-w-0 flex-1"
              style={{ '--fill': pct(volume, 1) } as CSSProperties}
              onChange={(e) => changeVolume(Number(e.target.value))}
            />
          </>
        )}
        {/* Fixed width, so cycling 1× to 1.25× never shifts its neighbours. */}
        <button
          type="button"
          aria-label={t('audio.speed')}
          title={t('audio.speed')}
          onClick={cycleSpeed}
          className="ml-auto h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 bg-card text-xs font-extrabold tabular-nums text-foreground hover:bg-background"
        >
          {speed}×
        </button>
      </div>
    </div>
  )
}
