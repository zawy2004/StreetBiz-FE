/**
 * The vendor's digital permit, kept on the phone so it can still be shown with no signal.
 *
 * What is kept is only what is printed on the permit: the signed code (the QR), the slot, the
 * dates and the status as the server last said it, and when. Nothing about identity (no ID
 * number, no photo). A copy belongs to one signed-in user and is removed on sign-out, so a shared
 * phone never shows the previous holder's permit.
 *
 * This is for *showing* the permit. It cannot be *checked* offline: whether a permit is still
 * valid is decided by the server (a revoked permit looks the same on screen), so the phone that
 * scans it needs a connection.
 */
export type OfflinePermit = {
  permitId: number;
  contractId: number;
  /** The signed token the QR encodes (also printed under the QR). */
  qrPayload: string;
  /** The link form of the QR when the server has a public base URL. */
  qrUrl: string | null;
  slotCode: string | null;
  zoneName: string | null;
  startDate: string;
  endDate: string;
  effectiveStatus: string;
  contractStatus: string;
  /** When this copy was read from the server (ms since the epoch). */
  savedAt: number;
};

const PREFIX = 'streetbiz:permit:';
/** A vendor rarely holds more than a couple of slots; this only bounds the storage. */
const MAX_PERMITS = 5;

const key = (userId: string | number) => `${PREFIX}${userId}`;

function isOfflinePermit(value: unknown): value is OfflinePermit {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.permitId === 'number' &&
    typeof p.contractId === 'number' &&
    typeof p.qrPayload === 'string' &&
    p.qrPayload.length > 0 &&
    typeof p.startDate === 'string' &&
    typeof p.endDate === 'string' &&
    typeof p.effectiveStatus === 'string' &&
    typeof p.savedAt === 'number'
  );
}

/** Every saved permit of this user, newest read first. Never throws: storage can be blocked. */
export function loadOfflinePermits(userId: string | number | undefined): OfflinePermit[] {
  if (userId === undefined || userId === null) return [];
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOfflinePermit).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export function loadOfflinePermit(
  userId: string | number | undefined,
  contractId: number,
): OfflinePermit | null {
  return loadOfflinePermits(userId).find((p) => p.contractId === contractId) ?? null;
}

/** Keeps the latest read of a permit, replacing the older copy of the same contract. */
export function saveOfflinePermit(
  userId: string | number | undefined,
  permit: OfflinePermit,
): void {
  if (userId === undefined || userId === null) return;
  const others = loadOfflinePermits(userId).filter((p) => p.contractId !== permit.contractId);
  const next = [permit, ...others].slice(0, MAX_PERMITS);
  try {
    localStorage.setItem(key(userId), JSON.stringify(next));
  } catch {
    // Private mode or a full disk: the permit simply is not available offline.
  }
}

/** Removes every saved permit of every user. Called on sign-out and when the session ends. */
export function clearOfflinePermits(): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) stale.push(k);
    }
    for (const k of stale) localStorage.removeItem(k);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

/**
 * The status to show for a saved copy. A saved "valid" permit whose end date has since passed
 * reads as expired: the phone knows the date even without the server. A saved copy is never made
 * *more* valid than the server said.
 */
export function offlineStatus(permit: OfflinePermit, now: number = Date.now()): string {
  if (permit.effectiveStatus !== 'VALID') return permit.effectiveStatus;
  const end = Date.parse(permit.endDate);
  if (!Number.isFinite(end)) return permit.effectiveStatus;
  // A bare date ("2027-01-10") parses as that midnight in UTC; the permit runs through the end of
  // that day in Vietnam (UTC+7), which is 17:00 UTC the same day. A full timestamp is used as is.
  const bareDate = /^\d{4}-\d{2}-\d{2}$/.test(permit.endDate);
  const expiresAt = bareDate ? end + 17 * 60 * 60 * 1000 : end;
  return now >= expiresAt ? 'EXPIRED' : permit.effectiveStatus;
}
