const SHELL_CACHE = 'alejandria-shell-v1'
const READER_CACHE = 'alejandria-reader-v1'
const OFFLINE_URL = '/offline'

const shellAssets = ['/', OFFLINE_URL, '/manifest.webmanifest', '/reader-icon.svg', '/reader-maskable.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(shellAssets)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== READER_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  if (['style', 'script', 'font', 'image'].includes(request.destination)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
  }
})

async function handleNavigation(request) {
  try {
    const response = await fetch(request)
    if (response.ok && request.url.includes('/read/')) {
      const cache = await caches.open(READER_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cachedReader = await caches.match(request)
    if (cachedReader) {
      return cachedReader
    }

    const offlineResponse = await caches.match(OFFLINE_URL)
    if (offlineResponse) {
      return offlineResponse
    }

    throw error
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}
