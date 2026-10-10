import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { applicationProgress } from '@/features/sidewalk-slots/application-progress';
import { RentalEligibilityMissing } from '@/features/sidewalk-slots/components/RentalEligibility';
import { SlotBayDrawing } from '@/features/sidewalk-slots/components/SlotBayDrawing';
import { TermRing } from '@/features/rental-contracts/components/TermRing';
import { holdFraction, occupancyLabel } from '@/features/sidewalk-slots/plan-labels';
import { countOutgoingByStage, daysSince } from '@/features/rental-contracts/transfer-view';
import { makeSlot } from './slot-fixtures';

describe('applicationProgress', () => {
  const states = (status: string) =>
    applicationProgress(status, '2026-09-19T03:00:00Z', '2026-09-20T03:00:00Z')?.map(
      (s) => s.state,
    );

  it('reads every status the list knows into three stops', () => {
    expect(states('PENDING')).toEqual(['done', 'waiting', 'todo']);
    expect(states('UNDER_REVIEW')).toEqual(['done', 'reviewing', 'todo']);
    expect(states('MORE_INFORMATION_REQUIRED')).toEqual(['done', 'attention', 'todo']);
    expect(states('APPROVED')).toEqual(['done', 'done', 'approved']);
    expect(states('REJECTED')).toEqual(['done', 'done', 'rejected']);
    expect(states('WITHDRAWN')).toEqual(['done', 'skipped', 'withdrawn']);
  });

  it('shows no steps for a status it does not know', () => {
    expect(applicationProgress('SOMETHING_NEW', '2026-09-19T03:00:00Z', null)).toBeNull();
  });
});

describe('plan labels', () => {
  it('drains a hold from its own start and end, not a fixed 15 minutes', () => {
    const heldAt = '2026-09-19T08:00:00Z';
    const expiresAt = '2026-09-19T08:10:00Z';
    expect(holdFraction(heldAt, expiresAt, Date.parse('2026-09-19T08:05:00Z'))).toBeCloseTo(0.5);
    expect(holdFraction(heldAt, expiresAt, Date.parse('2026-09-19T08:20:00Z'))).toBe(0);
  });

  it('names the occupancy bar with the same counts the plan uses', () => {
    expect(occupancyLabel({ total: 24, available: 10, pending: 5, active: 8, suspended: 1 })).toBe(
      '24 ô: 10 còn trống, 5 có đơn hoặc giữ chỗ, 8 đã thuê, 1 tạm ngưng',
    );
  });
});

describe('SlotBayDrawing', () => {
  it('prints no metres for a bay with no recorded size', () => {
    const slot = makeSlot({
      slotCode: 'NVL-18',
      latitude: 1,
      longitude: 1,
      widthMeters: null,
      lengthMeters: null,
    });
    const { container } = render(<SlotBayDrawing slot={slot} state="AVAILABLE" />);

    expect(screen.getByRole('img', { name: /Ô NVL-18, chưa đo kích thước/ })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d m\b/);
  });

  it('names a measured bay by its frontage, depth and area', () => {
    const slot = makeSlot({
      slotCode: 'NVL-14',
      latitude: 1,
      longitude: 1,
      widthMeters: 1.8,
      lengthMeters: 2.5,
      hasPower: true,
    });
    render(<SlotBayDrawing slot={slot} state="AVAILABLE" />);

    expect(
      screen.getByRole('img', {
        name: 'Ô NVL-14, mặt tiền 1,8 m, sâu 2,5 m, 4,5 m², có điện, không có nước, không có thùng rác',
      }),
    ).toBeInTheDocument();
  });
});

describe('RentalEligibilityMissing', () => {
  it('keeps the BR-16 sentence and points to the registrations page', () => {
    render(
      <MemoryRouter>
        <RentalEligibilityMissing />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Cần hồ sơ kinh doanh đã được duyệt để giữ chỗ hoặc nộp đơn.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem hồ sơ đăng ký/ })).toHaveAttribute(
      'href',
      '/vendor/registrations',
    );
  });
});

describe('TermRing', () => {
  it('has one progressbar and says the days left exactly once, in both sizes', () => {
    const today = new Date(2026, 9, 10);
    const { rerender } = render(
      <TermRing startDate="2026-09-01" endDate="2026-12-01" today={today} />,
    );
    expect(screen.getAllByRole('progressbar', { name: 'Tiến độ thời hạn thuê' })).toHaveLength(1);
    expect(screen.getAllByText('Còn 52 ngày')).toHaveLength(1);

    rerender(<TermRing startDate="2026-09-01" endDate="2026-12-01" today={today} size="lg" />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getAllByText('Còn 52 ngày')).toHaveLength(1);
  });
});

describe('transfer view', () => {
  it('counts sent requests by stage', () => {
    expect(
      countOutgoingByStage(
        ['PENDING', 'PENDING', 'ACCEPTED_BY_RECEIVER', 'APPROVED', 'REJECTED'].map(
          (transferStatus) => ({ transferStatus }),
        ),
      ),
    ).toEqual({ waitingReceiver: 2, waitingWard: 1, approved: 1, rejected: 1 });
  });

  it('counts days since sending in local days', () => {
    expect(daysSince(new Date(2026, 9, 7, 23, 0).toISOString(), new Date(2026, 9, 10, 1, 0))).toBe(
      3,
    );
    expect(daysSince('not a date', new Date())).toBe(0);
  });
});
