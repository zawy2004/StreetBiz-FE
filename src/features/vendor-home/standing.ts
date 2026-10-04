import type { ApiRegistration } from '@/core/api';
import { daysUntil } from './todos';

/** A permit the home screen should reason about, already normalised from live or mock data. */
export type PermitInfo = {
  contractId: number | string;
  slotCode: string | null;
  /** vw_PermitValidity.effective_status: VALID, NOT_YET_VALID, SUSPENDED, EXPIRED, REVOKED. */
  effectiveStatus: string;
  contractStatus: string;
  /** ISO date the permit starts being valid (live only). */
  startDate: string | null;
  /** ISO date the permit stops being valid. */
  endDate: string | null;
  /** What an officer's scanner reads: the signed payload live, the permit code in mock mode. */
  qrValue: string | null;
};

type Registration = Pick<
  ApiRegistration,
  'registrationId' | 'displayName' | 'registrationStatus' | 'reviewDecisionReason' | 'createdAt'
>;

/** Warn this many days before a permit runs out. */
export const EXPIRING_SOON_DAYS = 30;

const IN_REVIEW = new Set(['SUBMITTED', 'UNDER_REVIEW']);
const OPEN_REGISTRATION = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'APPROVED',
]);

/**
 * The one fact about the vendor's legal standing the home screen leads with.
 * Ordered by risk to the right to sell: not allowed to sell at all, then money
 * already overdue, then what the ward is waiting on, then a permit running out,
 * then money only coming due, then registration progress, then the all-clear.
 * Money that is merely due soon never outranks a permit about to lapse.
 */
export type Standing =
  | { kind: 'blocked'; permit: PermitInfo; others: number }
  | { kind: 'expired'; permit: PermitInfo; others: number; canRenew: boolean }
  | { kind: 'debt' }
  | { kind: 'unregistered' }
  | { kind: 'more-info'; registration: Registration }
  | { kind: 'expiring'; permit: PermitInfo; daysLeft: number }
  | { kind: 'rejected'; registration: Registration }
  | { kind: 'reviewing'; registration: Registration }
  | { kind: 'application-pending' }
  | { kind: 'approved-no-slot' }
  | { kind: 'not-yet-valid'; permit: PermitInfo }
  | { kind: 'valid'; permit: PermitInfo }
  | null;

export function pickStanding({
  registrations,
  permits,
  hasPendingApplication,
  hasOverdueDebt,
  hasDueSoonDebt,
  today = new Date(),
}: {
  registrations: Registration[];
  permits: PermitInfo[];
  hasPendingApplication: boolean;
  /** An overdue fee or an unpaid penalty. */
  hasOverdueDebt: boolean;
  /** Fees due within the to-do window but not overdue yet. */
  hasDueSoonDebt: boolean;
  today?: Date;
}): Standing {
  // REVOKED outranks SUSPENDED: one is final, the other can be lifted.
  const blocked = permits
    .filter((p) => p.effectiveStatus === 'REVOKED' || p.effectiveStatus === 'SUSPENDED')
    .sort(
      (a, b) =>
        (a.effectiveStatus === 'REVOKED' ? -1 : 0) - (b.effectiveStatus === 'REVOKED' ? -1 : 0),
    );
  if (blocked.length) return { kind: 'blocked', permit: blocked[0]!, others: blocked.length - 1 };

  const expired = permits.filter((p) => p.effectiveStatus === 'EXPIRED');
  if (expired.length) {
    const permit = expired[0]!;
    // The backend only renews a contract that is still ACTIVE.
    return {
      kind: 'expired',
      permit,
      others: expired.length - 1,
      canRenew: permit.contractStatus === 'ACTIVE',
    };
  }

  if (hasOverdueDebt) return { kind: 'debt' };

  const moreInfo = registrations.find((r) => r.registrationStatus === 'MORE_INFORMATION_REQUIRED');
  if (moreInfo) return { kind: 'more-info', registration: moreInfo };

  const valid = permits.filter((p) => p.effectiveStatus === 'VALID');
  const expiring = valid
    .filter((p) => p.endDate)
    .map((p) => ({ permit: p, daysLeft: daysUntil(p.endDate!, today) }))
    .filter((p) => p.daysLeft <= EXPIRING_SOON_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  if (expiring) return { kind: 'expiring', ...expiring };

  if (hasDueSoonDebt) return { kind: 'debt' };

  // A vendor with nothing on file is invited to start, not told there is nothing to do.
  if (registrations.length === 0 && permits.length === 0) return { kind: 'unregistered' };

  const approved = registrations.some((r) => r.registrationStatus === 'APPROVED');
  if (!approved) {
    const latest = (statuses: (s: string) => boolean) =>
      registrations
        .filter((r) => statuses(r.registrationStatus))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const reviewing = latest((s) => IN_REVIEW.has(s));
    if (reviewing) return { kind: 'reviewing', registration: reviewing };
    // A rejection only leads when nothing else is open; a newer submission replaces it.
    const rejected = latest((s) => s === 'REJECTED');
    if (rejected && !registrations.some((r) => OPEN_REGISTRATION.has(r.registrationStatus))) {
      return { kind: 'rejected', registration: rejected };
    }
  }

  if (valid.length) return { kind: 'valid', permit: valid[0]! };
  const notYet = permits.find((p) => p.effectiveStatus === 'NOT_YET_VALID');
  if (notYet) return { kind: 'not-yet-valid', permit: notYet };
  if (!approved || permits.length > 0) return null;
  return hasPendingApplication ? { kind: 'application-pending' } : { kind: 'approved-no-slot' };
}

/**
 * Which of the vendor's contracts count as "now". ACTIVE and SUSPENDED contracts
 * always do. A REVOKED or EXPIRED one only matters when nothing current replaced
 * it, and then only the most recent, so an old lapsed slot never hides a new one.
 */
export function currentPermits(all: PermitInfo[]): PermitInfo[] {
  const live = all.filter((p) => p.contractStatus === 'ACTIVE' || p.contractStatus === 'SUSPENDED');
  if (live.length) return live;
  const ended = all
    .filter((p) => p.contractStatus === 'REVOKED' || p.contractStatus === 'EXPIRED')
    .sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''));
  return ended.slice(0, 1);
}
