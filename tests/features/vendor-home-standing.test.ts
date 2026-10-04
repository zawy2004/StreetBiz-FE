import { describe, expect, it } from 'vitest';

import type { ApiRegistration } from '@/core/api';
import { currentPermits, pickStanding, type PermitInfo } from '@/features/vendor-home/standing';

const today = new Date(2026, 9, 4); // 04/10/2026

function permit(overrides: Partial<PermitInfo> = {}): PermitInfo {
  return {
    contractId: 1,
    slotCode: 'NVL-08',
    effectiveStatus: 'VALID',
    contractStatus: 'ACTIVE',
    startDate: null,
    endDate: '2026-12-31',
    qrValue: 'SB:1',
    ...overrides,
  };
}

function registration(
  registrationStatus: ApiRegistration['registrationStatus'],
  overrides: Partial<ApiRegistration> = {},
) {
  return {
    registrationId: 42,
    displayName: 'Xôi gà Bà Năm',
    registrationStatus,
    reviewDecisionReason: null,
    createdAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

const approved = [registration('APPROVED')];
const base = {
  registrations: approved,
  permits: [],
  hasPendingApplication: false,
  hasOverdueDebt: false,
  hasDueSoonDebt: false,
  today,
};

describe('pickStanding', () => {
  it('leads with a blocked permit even when money is owed, revoked before suspended', () => {
    const result = pickStanding({
      ...base,
      hasOverdueDebt: true,
      permits: [
        permit({ contractId: 1, effectiveStatus: 'SUSPENDED' }),
        permit({ contractId: 2, effectiveStatus: 'REVOKED' }),
      ],
    });
    expect(result).toMatchObject({ kind: 'blocked', permit: { contractId: 2 }, others: 1 });
  });

  it('offers renewal for an expired permit only while its contract is still active', () => {
    expect(
      pickStanding({ ...base, permits: [permit({ effectiveStatus: 'EXPIRED' })] }),
    ).toMatchObject({ kind: 'expired', canRenew: true });
    expect(
      pickStanding({
        ...base,
        permits: [permit({ effectiveStatus: 'EXPIRED', contractStatus: 'EXPIRED' })],
      }),
    ).toMatchObject({ kind: 'expired', canRenew: false });
  });

  it('puts overdue debt before a registration request and before an expiring permit', () => {
    expect(
      pickStanding({
        ...base,
        hasOverdueDebt: true,
        registrations: [
          ...approved,
          registration('MORE_INFORMATION_REQUIRED', { registrationId: 43 }),
        ],
        permits: [permit({ endDate: '2026-10-10' })],
      }),
    ).toEqual({ kind: 'debt' });
  });

  it('never lets money that is only due soon outrank a permit about to lapse or a ward request', () => {
    expect(
      pickStanding({ ...base, hasDueSoonDebt: true, permits: [permit({ endDate: '2026-10-04' })] }),
    ).toMatchObject({ kind: 'expiring', daysLeft: 0 });
    expect(
      pickStanding({
        ...base,
        hasDueSoonDebt: true,
        registrations: [
          ...approved,
          registration('MORE_INFORMATION_REQUIRED', { registrationId: 43 }),
        ],
      }),
    ).toMatchObject({ kind: 'more-info' });
    // With nothing more urgent, due-soon money still leads over the all-clear.
    expect(pickStanding({ ...base, hasDueSoonDebt: true, permits: [permit()] })).toEqual({
      kind: 'debt',
    });
  });

  it('asks for more evidence before warning about expiry', () => {
    const result = pickStanding({
      ...base,
      registrations: [
        ...approved,
        registration('MORE_INFORMATION_REQUIRED', { registrationId: 43 }),
      ],
      permits: [permit({ endDate: '2026-10-10' })],
    });
    expect(result).toMatchObject({ kind: 'more-info', registration: { registrationId: 43 } });
  });

  it('warns 30 days before a valid permit runs out, picking the soonest', () => {
    const result = pickStanding({
      ...base,
      permits: [
        permit({ contractId: 1, endDate: '2026-10-30' }),
        permit({ contractId: 2, endDate: '2026-10-16' }),
      ],
    });
    expect(result).toMatchObject({ kind: 'expiring', daysLeft: 12, permit: { contractId: 2 } });
    expect(pickStanding({ ...base, permits: [permit({ endDate: '2026-11-04' })] })).toMatchObject({
      kind: 'valid',
    });
  });

  it('shows a review in progress, and a rejection only when nothing else is open', () => {
    expect(pickStanding({ ...base, registrations: [registration('UNDER_REVIEW')] })).toMatchObject({
      kind: 'reviewing',
    });
    expect(pickStanding({ ...base, registrations: [registration('REJECTED')] })).toMatchObject({
      kind: 'rejected',
    });
    expect(
      pickStanding({
        ...base,
        registrations: [
          registration('REJECTED'),
          registration('SUBMITTED', { registrationId: 43, createdAt: '2026-09-20T00:00:00Z' }),
        ],
      }),
    ).toMatchObject({ kind: 'reviewing', registration: { registrationId: 43 } });
  });

  it('after approval, points to renting a slot until an application or a permit exists', () => {
    expect(pickStanding(base)).toEqual({ kind: 'approved-no-slot' });
    expect(pickStanding({ ...base, hasPendingApplication: true })).toEqual({
      kind: 'application-pending',
    });
    expect(pickStanding({ ...base, permits: [permit()] })).toMatchObject({ kind: 'valid' });
  });

  it('tells an approved vendor when a not-yet-valid permit starts', () => {
    expect(
      pickStanding({
        ...base,
        permits: [permit({ effectiveStatus: 'NOT_YET_VALID', startDate: '2026-10-10' })],
      }),
    ).toMatchObject({ kind: 'not-yet-valid', permit: { startDate: '2026-10-10' } });
  });

  it('invites a vendor with nothing on file to register', () => {
    expect(pickStanding({ ...base, registrations: [] })).toEqual({ kind: 'unregistered' });
  });
});

describe('currentPermits', () => {
  it('ignores an old lapsed contract once a current one exists', () => {
    const live = permit({ contractId: 2 });
    expect(
      currentPermits([
        permit({ contractId: 1, contractStatus: 'EXPIRED', effectiveStatus: 'EXPIRED' }),
        live,
      ]),
    ).toEqual([live]);
  });

  it('keeps only the most recent ended contract when nothing is current', () => {
    const older = permit({
      contractId: 1,
      contractStatus: 'EXPIRED',
      effectiveStatus: 'EXPIRED',
      endDate: '2026-03-31',
    });
    const newer = permit({
      contractId: 2,
      contractStatus: 'REVOKED',
      effectiveStatus: 'REVOKED',
      endDate: '2026-09-30',
    });
    expect(currentPermits([older, newer])).toEqual([newer]);
  });
});
