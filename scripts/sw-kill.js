/*
 * Emergency switch. To remove the service worker from every browser, copy this file over
 * public/sw.js and deploy. On a visitor's next load the browser fetches the new sw.js, this
 * worker installs, deletes every StreetBiz cache, unregisters itself and reloads the open pages
 * so they come straight from the network.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('streetbiz-')) await caches.delete(name);
      }
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) client.navigate(client.url);
    })(),
  );
});
