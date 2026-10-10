import type { FoodSafetyApplication } from '@/core/api/food-safety-api';
import {
  countByStation,
  daysLeft,
  groupApplications,
  journeyMilestones,
  matchesQuickFilter,
  stepStates,
  validitySpan,
  waitingOn,
  waitingText,
} from '@/features/food-safety/view';

const file = (id: number, extra: Partial<FoodSafetyApplication> = {}): FoodSafetyApplication => ({
  applicationId: id,
  storefrontId: 1,
  storefrontName: 'Bánh mì & Xôi Cô Lan',
  vendorName: 'Phạm Thị Lan',
  status: 'SUBMITTED',
  vendorNote: null,
  reviewReason: null,
  reviewedAt: null,
  forwardedAt: null,
  departmentName: null,
  certificateNumber: null,
  issuedOn: null,
  expiresOn: null,
  isExpired: false,
  resultReason: null,
  resultRecordedAt: null,
  submittedAt: '2026-10-01T03:00:00Z',
  dishes: [{ menuItemId: 1, name: 'Xôi gà xé', categoryName: 'Bánh mì - Xôi', imageUrl: null }],
  evidence: [],
  actions: [],
  ...extra,
});

describe('ATTP file grouping', () => {
  it('puts what the vendor must do first and keeps the server order inside each group', () => {
    const list = [
      file(1, { status: 'APPROVED', expiresOn: '2029-01-01' }),
      file(2, { status: 'SUBMITTED' }),
      file(3, { status: 'MORE_INFORMATION_REQUIRED', actions: ['RESUBMIT', 'WITHDRAW'] }),
      file(4, { status: 'APPROVED', isExpired: true }),
      file(5, { status: 'FORWARDED' }),
      file(6, { status: 'WITHDRAWN' }),
      file(7, { status: 'REJECTED' }),
    ];
    const groups = groupApplications(list);
    expect(groups.todo.map((f) => f.applicationId)).toEqual([3]);
    expect(groups.reviewing.map((f) => f.applicationId)).toEqual([2, 5]);
    expect(groups.valid.map((f) => f.applicationId)).toEqual([1]);
    expect(groups.closed.map((f) => f.applicationId)).toEqual([4, 6, 7]);
  });

  it('counts files per status for the ward route', () => {
    const counts = countByStation([file(1), file(2), file(3, { status: 'FORWARDED' })]);
    expect(counts.SUBMITTED).toBe(2);
    expect(counts.FORWARDED).toBe(1);
    expect(counts.total).toBe(3);
  });
});

describe('ATTP days', () => {
  it('counts days left on the Vietnamese calendar', () => {
    // 2026-10-10 23:30 UTC is already 11/10 in Đà Nẵng.
    expect(daysLeft('2026-10-12', Date.parse('2026-10-10T23:30:00Z'))).toBe(1);
    expect(daysLeft(null)).toBeNull();
  });

  it('says who holds a file and since when', () => {
    const now = Date.parse('2026-10-07T03:00:00Z');
    expect(waitingOn(file(1), now)).toEqual({ who: 'WARD', since: file(1).submittedAt, days: 6 });
    expect(
      waitingOn(file(2, { status: 'FORWARDED', forwardedAt: '2026-10-04T02:00:00Z' }), now).who,
    ).toBe('DEPARTMENT');
    expect(
      waitingOn(
        file(3, { status: 'MORE_INFORMATION_REQUIRED', reviewedAt: '2026-10-05T02:00:00Z' }),
        now,
      ),
    ).toMatchObject({ who: 'VENDOR', days: 2 });
    expect(waitingText(file(4), now)).toBe('Phường cần xét · 6 ngày');
    expect(waitingText(file(5, { status: 'APPROVED' }), now)).toBeNull();
  });

  it('reads a validity span in years and months, null when reversed', () => {
    expect(validitySpan('2026-01-01', '2029-01-01')).toBe('3 năm');
    expect(validitySpan('2026-01-01', '2027-07-01')).toBe('1 năm 6 tháng');
    expect(validitySpan('2026-01-10', '2026-01-01')).toBeNull();
  });
});

describe('ATTP route marks', () => {
  it('marks the step a file waits at and where it was refused', () => {
    expect(stepStates(file(1))).toEqual(['done', 'current', 'todo']);
    expect(stepStates(file(2, { status: 'FORWARDED' }))).toEqual(['done', 'done', 'current']);
    expect(stepStates(file(3, { status: 'REJECTED' }))).toEqual(['failed', 'todo', 'todo']);
    expect(
      stepStates(file(4, { status: 'REJECTED', forwardedAt: '2026-10-02T00:00:00Z' })),
    ).toEqual(['done', 'done', 'failed']);
  });

  it('turns the ward review red when the ward refused before forwarding', () => {
    const marks = journeyMilestones(file(1, { status: 'REJECTED' }));
    expect(marks.find((m) => m.key === 'reviewed')?.state).toBe('failed');
    const forwarded = journeyMilestones(
      file(2, {
        status: 'FORWARDED',
        forwardedAt: '2026-10-02T00:00:00Z',
        departmentName: 'Chi cục',
      }),
    );
    expect(forwarded.find((m) => m.key === 'forwarded')).toMatchObject({
      state: 'done',
      label: 'Chuyển Chi cục',
    });
  });

  it('filters on stall, vendor or dish, ignoring accents', () => {
    expect(matchesQuickFilter(file(1), 'xoi ga')).toBe(true);
    expect(matchesQuickFilter(file(1), 'lan')).toBe(true);
    expect(matchesQuickFilter(file(1), 'phở')).toBe(false);
    expect(matchesQuickFilter(file(1), '  ')).toBe(true);
  });
});
