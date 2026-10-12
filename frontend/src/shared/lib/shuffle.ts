/** A small seeded PRNG (mulberry32): the same seed always gives the same sequence. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A shuffled copy of `items`. The order depends only on `seed`, so a session keeps its order across page reloads
 * while every new session (a new seed) gets a different one.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items]
  const next = rng(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
