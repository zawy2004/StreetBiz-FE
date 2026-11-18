/*
 * StreetBiz service worker. Deliberately small: it exists so the app opens with no signal.
 *
 * It caches only two things:
 *   1. the page shell (index.html), network-first: with a connection you always get the newest
 *      deploy, without one the last shell you loaded;
 *   2. /assets/* (the JS, CSS and images of a build), cache-first: their file names carry a hash,
 *      so a cached copy can never be a stale version of the same name.
 *
 * Everything else (the API, fonts, other sites, anything that is not a GET) is NOT touched: the
 * browser handles it as if there were no service worker. In particular no API response is ever
 * stored here; the permit is kept by the app itself (src/core/pwa/permit-offline-store.ts) and
 * removed on sign-out.
 *
 * If a bad worker ever ships and users get stuck on an old version, copy scripts/sw-kill.js over
 * this file and deploy: it removes the worker and its caches on the next visit.
 */
const VERSION = 'v1';
const SHELL_CACHE = `streetbiz-shell-${VERSION}`;
const ASSET_CACHE = `streetbiz-assets-${VERSION}`;
const SHELL_KEY = '/index.html';
/** Asset files kept; the oldest are dropped beyond this (a build rarely has more than a few dozen). */
const MAX_ASSETS = 120;

self.addEventListener('install', () => {
  // Take over as soon as installed, so the next page load already uses the newest worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      for (const name of await caches.keys()) {
        if (name.startsWith('streetbiz-') && !keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(shell(request));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(asset(request));
  }
});

/** Network-first for a page: remember the shell on success, serve it when the network is gone. */
async function shell(request) {
  try {
    const response = await fetch(request);
    // A 200 page is the SPA shell (every route serves the same index.html). Keep one copy.
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(SHELL_KEY, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(SHELL_KEY, { cacheName: SHELL_CACHE });
    if (cached) return cached;
    throw error;
  }
}

/** Cache-first for a hashed build file. */
async function asset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
}
