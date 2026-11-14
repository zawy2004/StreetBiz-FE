import { env } from '@/core/config/env';

/**
 * Public files the backend serves (dish photos) come back origin-relative
 * (`/api/uploads/...`), but the API runs on its own origin. Resolve them against
 * the API origin so an `<img src>` works; absolute URLs pass through unchanged.
 */
/**
 * The illustrative photos (dish stock photos, street hero) live on the API, not in this bundle:
 * `staticPhotoUrl('food/pho.jpg')` is `https://<api-host>/static/food/pho.jpg`. Without an API
 * address (a misconfigured build) it falls back to a same-origin path, which simply 404s.
 */
export function staticPhotoUrl(path: string): string {
  const relative = `/static/${path}`;
  if (!env.apiBaseUrl) return relative;
  try {
    return new URL(relative, new URL(env.apiBaseUrl).origin).toString();
  } catch {
    return relative;
  }
}

export function apiAssetUrl(url: string): string {
  if (!url.startsWith('/api/') || !env.apiBaseUrl) return url;
  try {
    return new URL(url, new URL(env.apiBaseUrl).origin).toString();
  } catch {
    return url;
  }
}
