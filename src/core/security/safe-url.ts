/**
 * URL guards for values that come from data (the API, a QR code, another user) rather than from
 * our own code. React escapes text, but it does not stop a `javascript:` URL in an `href` or in
 * `window.location`, and axios sends an absolute URL to whatever host it names, bearer token
 * included. Every data-derived link, redirect or file download goes through one of these.
 */

const WEB_PROTOCOLS = new Set(['https:', 'http:']);

/**
 * A link or redirect target that can only open a web page: absolute http(s), or a path on this
 * site ("/orders/12"). Anything else -- `javascript:`, `data:`, `vbscript:`, `streetbiz:`,
 * protocol-relative "//evil.com" -- gives null.
 */
export function safeWebUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\'))
    return trimmed;
  try {
    const url = new URL(trimmed);
    return WEB_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * True when a request URL goes to our own API: a relative path, or an absolute URL on the API's
 * origin. Only those requests may carry the bearer token.
 */
export function isApiRequestUrl(url: string | undefined, apiBaseUrl: string | undefined): boolean {
  if (!url) return true;
  if (!/^[a-z][a-z\d+.-]*:/i.test(url) && !url.startsWith('//')) return true;
  if (!apiBaseUrl) return false;
  try {
    return new URL(url).origin === new URL(apiBaseUrl).origin;
  } catch {
    return false;
  }
}

export class UnsafeFileUrlError extends Error {
  constructor() {
    super('Đường dẫn tệp không hợp lệ.');
    this.name = 'UnsafeFileUrlError';
  }
}

/**
 * A stored file URL (`/api/uploads/...`) as a path for the API client. Files only ever live under
 * `/api/uploads/`; any other value (an absolute URL to another host, `..` tricks) is refused so a
 * planted link can never make the app fetch it with the signed-in user's token.
 */
export function uploadsApiPath(fileUrl: string): string {
  const value = fileUrl.trim();
  if (!value.startsWith('/api/uploads/') || value.includes('..') || value.includes('\\')) {
    throw new UnsafeFileUrlError();
  }
  return value.slice('/api'.length);
}
