// TeamSync AI service worker — minimal shell cache + network-first for everything else
const CACHE_VERSION = "teamsync-v1"
const ESSENTIAL_CACHE = `${CACHE_VERSION}-essential`

const ESSENTIAL_FILES = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ESSENTIAL_CACHE).then((cache) => cache.addAll(ESSENTIAL_FILES))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Network-first for navigation (so users always see latest UI)
// Cache-first for icon/static assets
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Skip cross-origin (e.g., supabase, vercel _next chunks have hashes)
  if (url.origin !== self.location.origin) return

  // Static assets — cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/i)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(ESSENTIAL_CACHE).then((c) => c.put(request, copy))
            return res
          })
      )
    )
    return
  }

  // Navigation requests — network first, fall back to offline shell if needed
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            new Response(
              "<html><body style='font-family:system-ui;padding:40px;text-align:center'><h1>TeamSync AI</h1><p>You are offline. Reconnect to continue.</p></body></html>",
              { headers: { "Content-Type": "text/html" } }
            )
        )
      )
    )
  }
})
