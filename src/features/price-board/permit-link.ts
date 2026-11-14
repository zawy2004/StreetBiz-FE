/**
 * The text a permit QR carries (BUY-06). A printed price board encodes a link,
 * `{base}/q/{token}?v={version}`, so an ordinary phone camera opens the public page; older
 * permits and the paste boxes carry the bare signed `SBP1…` token. The link only wraps the token
 * the server signed: nothing here makes a code, and validity is always the server's live answer.
 * Mirrors StreetBiz-BE `PermitQrText` so the screens can show what was scanned.
 */

const SCAN_SEGMENT = 'q';

function httpUrl(text: string): URL | null {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** The token inside scanned text: the segment after `/q/` of a link, else the trimmed text. */
export function permitTokenOf(text: string): string {
  const trimmed = text.trim();
  const url = httpUrl(trimmed);
  if (!url) return trimmed;
  const segments = url.pathname.split('/').filter(Boolean);
  for (let i = segments.length - 2; i >= 0; i -= 1) {
    if (segments[i] === SCAN_SEGMENT) {
      try {
        return decodeURIComponent(segments[i + 1]!);
      } catch {
        return segments[i + 1]!;
      }
    }
  }
  return trimmed;
}

/** A positive whole version number, else undefined. */
export function parseVersion(value: string | null | undefined): number | undefined {
  if (!value || !/^\d{1,9}$/.test(value)) return undefined;
  const version = Number(value);
  return version > 0 ? version : undefined;
}

/** The board version printed on a scanned link (`?v=N`), when there is one. */
export function printedVersionOf(text: string): number | undefined {
  const url = httpUrl(text.trim());
  return url ? parseVersion(url.searchParams.get('v')) : undefined;
}

/** `/q/{token}`: the public permit and price-board page. */
export function publicPagePath(token: string): string {
  return `/${SCAN_SEGMENT}/${encodeURIComponent(token)}`;
}

/** `/q/{token}/print`: the A5 price board to print and hang at the stall. */
export function printPagePath(token: string): string {
  return `${publicPagePath(token)}/print`;
}

/**
 * The web origin (and any path prefix) this page is served from: everything before `/q/` in the
 * current address, so a board printed from `{base}/q/…/print` links back to that same base.
 */
export function currentScanBase(location: Pick<Location, 'origin' | 'pathname'> = window.location) {
  const at = location.pathname.indexOf(`/${SCAN_SEGMENT}/`);
  const prefix = at > 0 ? location.pathname.slice(0, at) : '';
  return `${location.origin}${prefix}`;
}

/** The link a printed board's QR encodes: `{base}/q/{token}?v={version}`. */
export function scanLinkFor(token: string, version: number, base = currentScanBase()): string {
  return `${base}${publicPagePath(token)}?v=${version}`;
}
