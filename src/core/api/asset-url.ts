import { env } from '@/core/config/env';

/**
 * Public files the backend serves (dish photos) come back origin-relative
 * (`/api/uploads/...`), but the API runs on its own origin. Resolve them against
 * the API origin so an `<img src>` works; absolute URLs pass through unchanged.
 */
export function apiAssetUrl(url: string): string {
  if (!url.startsWith('/api/') || !env.apiBaseUrl) return url;
  try {
    return new URL(url, new URL(env.apiBaseUrl).origin).toString();
  } catch {
    return url;
  }
}
