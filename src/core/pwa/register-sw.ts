/**
 * Registers the service worker (public/sw.js) once the page has finished loading, in a production
 * build only: the dev server serves modules that must never be cached.
 *
 * A failure to register (blocked storage, an old browser) is silent: the app works the same,
 * only without opening offline.
 */
export function registerServiceWorker(
  target: Window = window,
  production: boolean = import.meta.env.PROD,
): void {
  if (!production || !('serviceWorker' in target.navigator)) return;

  const register = () => {
    target.navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* offline opening is a bonus; never surface this */
    });
  };

  if (target.document.readyState === 'complete') register();
  else target.addEventListener('load', register, { once: true });
}
