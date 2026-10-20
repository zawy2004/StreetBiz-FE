/**
 * Access/refresh token persistence.
 *
 * The backend returns a bearer access token plus an opaque refresh token whose
 * SHA-256 hash it stores in UserSessions. There is no auth cookie, so the SPA has
 * to keep both. localStorage is used to survive a reload; note this is readable by
 * any script on the origin, which the team should revisit if the backend ever
 * moves the refresh token to an httpOnly cookie.
 */
const STORAGE_KEY = 'streetbiz-tokens';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  /** ISO-8601 UTC instant the access token stops being accepted. */
  accessTokenExpiresAtUtc: string;
};

let cached: AuthTokens | null | undefined;

export function getTokens(): AuthTokens | null {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cached = raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function setTokens(tokens: AuthTokens): void {
  cached = tokens;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Private-mode or quota failure: the in-memory copy still serves this tab.
  }
}

export function clearTokens(): void {
  cached = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — the in-memory copy is already cleared.
  }
}

export function getAccessToken(): string | null {
  return getTokens()?.accessToken ?? null;
}
