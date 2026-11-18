/**
 * Registers the service worker (`public/sw.js`) so the site installs to the home screen and its
 * shell opens offline. Production only: in `npm run dev` a worker would serve stale files while
 * code is being changed.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Private mode or an old browser: the site simply works without being installable.
    });
  });
}
