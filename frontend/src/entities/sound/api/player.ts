import { api, type Sound, type SoundSlot } from '@/shared/api'

// Sounds are decoded once and played through the Web Audio API: unlike <audio>, a context that a tap has unlocked
// plays from anywhere afterwards (after a network request, or after the session screen has been left).
let ctx: AudioContext | undefined
const buffers = new Map<SoundSlot, { version: string; buffer: AudioBuffer }>()
const loading = new Map<SoundSlot, string>()

function context() {
  try {
    ctx ??= new AudioContext()
  } catch {
    // no Web Audio: sounds are simply not played
  }
  return ctx
}

const unlock = () => void context()?.resume()
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, unlock, { passive: true })
}

/** Fetches and decodes the sounds that are new or changed since they were last loaded. */
export async function preloadSounds(sounds: Sound[]) {
  const c = context()
  if (!c) return
  await Promise.all(
    sounds.map(async ({ slot, updatedAt }) => {
      if (buffers.get(slot)?.version === updatedAt || loading.get(slot) === updatedAt) return
      loading.set(slot, updatedAt)
      try {
        const { data, response } = await api.GET('/sounds/{slot}/file', { params: { path: { slot } }, parseAs: 'arrayBuffer' })
        if (!response.ok || !data) return
        buffers.set(slot, { version: updatedAt, buffer: await c.decodeAudioData(data) })
      } catch {
        // a sound that fails to load is skipped
      } finally {
        if (loading.get(slot) === updatedAt) loading.delete(slot)
      }
    }),
  )
}

/** Plays the first of the slots that has a sound loaded; none loaded, nothing plays. */
export function playSound(...slots: SoundSlot[]) {
  const c = context()
  if (!c) return
  const found = slots.map((s) => buffers.get(s)).find(Boolean)
  if (!found) return
  void c.resume()
  const src = c.createBufferSource()
  src.buffer = found.buffer
  src.connect(c.destination)
  src.start()
}

/** The admin's preview of one slot: loads it if needed and plays it whatever the user's sound setting is. */
export async function previewSound(sound: Sound) {
  await preloadSounds([sound])
  playSound(sound.slot)
}
