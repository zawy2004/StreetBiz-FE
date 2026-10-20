import type { RentalApplication } from '@/core/api/side-api';
import {
  applicationGroup,
  contractProgress,
  countApplications,
  extendedEndDate,
  filterApplications,
  isLiveContract,
  splitContracts,
  transferSteps,
} from '@/features/sidewalk-slots/my-slots-view';

const app = (applicationId: number, applicationStatus: string) =>
  ({ applicationId, applicationStatus }) as RentalApplication;

const APPLICATIONS = [
  app(1, 'MORE_INFORMATION_REQUIRED'),
  app(2, 'PENDING'),
  app(3, 'APPROVED'),
  app(4, 'REJECTED'),
  app(5, 'WITHDRAWN'),
  app(6, 'UNDER_REVIEW'),
];

describe('application filters', () => {
  it('groups every known status under exactly one chip', () => {
    expect(applicationGroup('PENDING')).toBe('OPEN');
    expect(applicationGroup('UNDER_REVIEW')).toBe('OPEN');
    expect(applicationGroup('MORE_INFORMATION_REQUIRED')).toBe('OPEN');
    expect(applicationGroup('APPROVED')).toBe('APPROVED');
    expect(applicationGroup('REJECTED')).toBe('CLOSED');
    expect(applicationGroup('WITHDRAWN')).toBe('CLOSED');
    expect(applicationGroup('SOMETHING_NEW')).toBeNull();
  });

  it('counts each chip, with the total covering an unknown status too', () => {
    expect(countApplications([...APPLICATIONS, app(7, 'SOMETHING_NEW')])).toEqual({
      ALL: 7,
      OPEN: 3,
      APPROVED: 1,
      CLOSED: 2,
    });
  });

  it('filters by chip and keeps the order it was given', () => {
    expect(filterApplications(APPLICATIONS, 'OPEN').map((a) => a.applicationId)).toEqual([1, 2, 6]);
    expect(filterApplications(APPLICATIONS, 'CLOSED').map((a) => a.applicationId)).toEqual([4, 5]);
    expect(filterApplications(APPLICATIONS, 'ALL')).toHaveLength(6);
    expect(filterApplications([], 'APPROVED')).toEqual([]);
  });
});

describe('splitContracts', () => {
  it('keeps active and suspended contracts as live and the rest as ended', () => {
    const { live, ended } = splitContracts([
      { contractStatus: 'ACTIVE' },
      { contractStatus: 'SUSPENDED' },
      { contractStatus: 'EXPIRED' },
      { contractStatus: 'CANCELLED' },
      { contractStatus: 'REVOKED' },
    ]);

    expect(live.map((c) => c.contractStatus)).toEqual(['ACTIVE', 'SUSPENDED']);
    expect(ended.map((c) => c.contractStatus)).toEqual(['EXPIRED', 'CANCELLED', 'REVOKED']);
  });
});

describe('contractProgress', () => {
  // 90-day term: 1 Sep 2026 to 30 Nov 2026.
  const today = (iso: string) => new Date(`${iso}T15:30:00`);

  it('reports how much of the term has passed and the days left', () => {
    expect(contractProgress('2026-09-01', '2026-11-30', today('2026-09-01'))).toEqual({
      percent: 0,
      daysLeft: 90,
      expiringSoon: false,
    });
    expect(contractProgress('2026-09-01', '2026-11-30', today('2026-10-16'))).toMatchObject({
      percent: 50,
      daysLeft: 45,
    });
  });

  it('flags a contract within 14 days of its end, including the last day', () => {
    expect(contractProgress('2026-09-01', '2026-11-30', today('2026-11-16'))).toMatchObject({ daysLeft: 14, expiringSoon: true });
    expect(contractProgress('2026-09-01', '2026-11-30', today('2026-11-15'))).toMatchObject({ daysLeft: 15, expiringSoon: false });
    expect(contractProgress('2026-09-01', '2026-11-30', today('2026-11-30'))).toMatchObject({ daysLeft: 0, expiringSoon: true });
  });

  it('never goes below 0 days or outside 0-100 percent', () => {
    expect(contractProgress('2026-09-01', '2026-11-30', today('2027-01-01'))).toEqual({
      percent: 100,
      daysLeft: 0,
      expiringSoon: true,
    });
    expect(contractProgress('2026-09-01', '2026-11-30', today('2026-08-01')).percent).toBe(0);
  });

  it('treats an empty term as complete instead of dividing by zero', () => {
    expect(contractProgress('2026-09-01', '2026-09-01', today('2026-09-01')).percent).toBe(100);
  });
});

describe('transferSteps', () => {
  it('marks the step a transfer is waiting on', () => {
    expect(transferSteps('PENDING')).toEqual(['done', 'current', 'todo']);
    expect(transferSteps('ACCEPTED_BY_RECEIVER')).toEqual(['done', 'done', 'current']);
    expect(transferSteps('APPROVED')).toEqual(['done', 'done', 'done']);
  });

  it('has no progress for a rejected or unknown transfer', () => {
    expect(transferSteps('REJECTED')).toBeNull();
    expect(transferSteps('SOMETHING_NEW')).toBeNull();
  });
});

describe('isLiveContract', () => {
  it('treats active and suspended contracts as not yet ended', () => {
    expect(isLiveContract('ACTIVE')).toBe(true);
    expect(isLiveContract('SUSPENDED')).toBe(true);
    expect(isLiveContract('EXPIRED')).toBe(false);
    expect(isLiveContract('CANCELLED')).toBe(false);
  });
});

describe('extendedEndDate', () => {
  it('adds days to the end date, across a month and a year', () => {
    expect(extendedEndDate('2026-12-01', 90).toLocaleDateString('en-CA')).toBe('2027-03-01');
    expect(extendedEndDate('2026-01-31', 30).toLocaleDateString('en-CA')).toBe('2026-03-02');
    expect(extendedEndDate('2026-09-19T00:00:00', 1).toLocaleDateString('en-CA')).toBe('2026-09-20');
  });
});
