// Minimal service worker: makes the app installable and the shell load without a network.
// API calls are never cached, so data is always live and nothing private is stored.
const CACHE = 'rusexam-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Pages: network first, so a new deploy shows up immediately; the cached shell is the offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          void caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/').then((r) => r ?? Response.error())),
    )
    return
  }

  // Built assets are content-hashed, so a cached copy is always right; everything else refreshes in the background.
  const immutable = url.pathname.startsWith('/assets/')
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit && immutable) return hit
      const network = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          void caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      return hit ?? network
    }),
  )
})
