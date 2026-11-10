/**
 * After a new deploy, a tab that was opened before it still points at the old script
 * chunks, which no longer exist, so the first lazy screen it opens fails to load. Vite
 * reports that as `vite:preloadError`; reloading fetches the new index.html and its chunks.
 *
 * Reloads at most once a minute, so a chunk that is genuinely broken shows the error
 * screen instead of reloading forever.
 */
const KEY = 'streetbiz:chunk-reload-at';
const MIN_INTERVAL_MS = 60_000;

export function reloadOnStaleChunk(
  target: Window = window,
  now: () => number = Date.now,
): () => void {
  const onError = (event: Event) => {
    let last = 0;
    try {
      last = Number(target.sessionStorage.getItem(KEY)) || 0;
    } catch {
      // Storage blocked: still reload once for this page view.
    }
    if (now() - last < MIN_INTERVAL_MS) return;

    try {
      target.sessionStorage.setItem(KEY, String(now()));
    } catch {
      // Ignore: the interval guard just will not survive the reload.
    }
    event.preventDefault();
    target.location.reload();
  };

  target.addEventListener('vite:preloadError', onError);
  return () => target.removeEventListener('vite:preloadError', onError);
}
