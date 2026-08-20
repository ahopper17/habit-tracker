/*
 * Hand-written service worker.
 *
 * This file lives in public/ and is copied to the build output VERBATIM — Vite
 * never processes it. That has one consequence worth understanding: it cannot
 * import or even know the hashed asset filenames (index-BBsKyqRY.js), because
 * those are decided at build time and change on every deploy. So the precache
 * list below is only the handful of files whose names are stable, and the
 * hashed bundles get cached the first time they are actually requested.
 *
 * Strategy: stale-while-revalidate. Serve from cache immediately if we have it,
 * and refresh the cache from the network in the background for next time. The
 * app opens instantly and works offline; the cost is that a deploy is seen one
 * launch late. For a personal habit tracker that is the right trade — nobody
 * wants to watch a spinner to tick a checkbox.
 */

// Bump this to throw away every cached file. Rarely needed: JS and CSS are
// content-hashed, so new builds land under new keys on their own. Bump it when
// the caching logic here changes and stale entries could be mis-served.
const CACHE = 'habit-tracker-v1'

// sw.js sits at <base>/sw.js, so "./" resolves to <base>/ — which is the app
// shell. Deriving it this way means nothing here hardcodes "/habit-tracker/".
const SHELL = new URL('./', self.location.href).href

const EXTRA_PRECACHE = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png',
].map((path) => new URL(path, self.location.href).href)

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)

      // The shell is required — without it there is no offline app at all, so
      // let a failure here fail the install and leave the old worker in place.
      await cache.add(new Request(SHELL, { cache: 'reload' }))

      // Icons are optional. One 404 should not cost us offline support, so
      // these are added individually and allowed to fail.
      await Promise.all(EXTRA_PRECACHE.map((url) => cache.add(url).catch(() => {})))

      // Activate immediately instead of waiting for every tab to close.
      //
      // This is safe HERE because the build is a single bundle with no lazy
      // chunks: by the time a new worker takes over, the running page has
      // already loaded everything it needs. If we ever add code-splitting, a
      // running page could request an old chunk that the new worker's cleanup
      // has deleted — revisit this line then.
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      // Take control of pages that loaded before this worker existed, so the
      // very first visit is offline-capable without a second reload.
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only GET is cacheable, and only our own origin is ours to cache.
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  // A navigation is a request for "a page", whatever the path. There is one
  // page in this app, so every navigation resolves to the shell — which is also
  // what makes a deep link work offline.
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(new Request(SHELL), { navigation: true }))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

async function staleWhileRevalidate(request, { navigation = false } = {}) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)

  // Kick off the refresh regardless of a cache hit — that is the "revalidate"
  // half. It is deliberately not awaited when we already have a cached copy.
  const fresh = fetch(request)
    .then((response) => {
      // Opaque and error responses are not worth persisting; caching a 404
      // would keep serving it long after the file came back.
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  if (cached) return cached

  const response = await fresh
  if (response) return response

  // Offline with nothing cached. Only reachable before the first successful
  // load, since install precaches the shell.
  if (navigation) {
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  return Response.error()
}

const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<style>
  body { margin:0; min-height:100dvh; display:grid; place-items:center;
         background:#FBF7F1; color:#3D3A33;
         font-family:-apple-system,system-ui,sans-serif; text-align:center; padding:2rem; }
  p { color:#8C8577; }
</style></head>
<body><div><h1>Offline</h1><p>Open this once with a connection and it will work offline after that.</p></div></body></html>`
