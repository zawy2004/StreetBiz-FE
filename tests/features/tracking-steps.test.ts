import {
  buildTrackingSteps,
  hasTrackingJourney,
  normalizeTrackingStatus,
  trackingProgress,
} from '@/features/orders/tracking/tracking-steps';
import type { OrderStatusHistory } from '@/features/orders/types/order.types';

const at = (toStatus: OrderStatusHistory['toStatus'], changedAt: string): OrderStatusHistory => ({
  toStatus,
  changedAt,
});

describe('order tracking steps (ORD-02)', () => {
  it('shows what is done, where the order is, and what is still to come', () => {
    const steps = buildTrackingSteps('PREPARING', [
      at('PENDING_PAYMENT', '2026-10-02T03:00:00Z'),
      at('PLACED', '2026-10-02T03:01:00Z'),
      at('ACCEPTED', '2026-10-02T03:02:00Z'),
      at('PREPARING', '2026-10-02T03:03:00Z'),
    ]);

    expect(steps.map((s) => [s.status, s.state])).toEqual([
      ['PLACED', 'done'],
      ['ACCEPTED', 'done'],
      ['PREPARING', 'current'],
      ['READY_FOR_PICKUP', 'upcoming'],
      ['COMPLETED', 'upcoming'],
    ]);
    expect(steps[1]?.reachedAt).toBe('2026-10-02T03:02:00Z');
    expect(steps[3]?.reachedAt).toBeNull();
    expect(trackingProgress(steps)).toBe(0.5);
  });

  it('marks every step done once the order is collected', () => {
    const steps = buildTrackingSteps('COMPLETED', []);

    expect(steps.every((s) => s.state === 'done')).toBe(true);
    expect(trackingProgress(steps)).toBe(1);
  });

  it('counts a step the stall skipped as done, without inventing a time for it', () => {
    const steps = buildTrackingSteps('READY_FOR_PICKUP', [
      at('PLACED', '2026-10-02T03:01:00Z'),
      at('ACCEPTED', '2026-10-02T03:02:00Z'),
      at('READY_FOR_PICKUP', '2026-10-02T03:12:00Z'),
    ]);

    expect(steps[2]).toMatchObject({ status: 'PREPARING', state: 'done', reachedAt: null });
    expect(steps[3]).toMatchObject({ state: 'current', reachedAt: '2026-10-02T03:12:00Z' });
  });

  it('stops where a cancelled order stopped, promising nothing after it', () => {
    const steps = buildTrackingSteps('CANCELLED', [
      at('PLACED', '2026-10-02T03:01:00Z'),
      at('CANCELLED', '2026-10-02T03:04:00Z'),
    ]);

    expect(steps.map((s) => [s.status, s.state])).toEqual([
      ['PLACED', 'done'],
      ['CANCELLED', 'stopped'],
    ]);
    expect(steps[1]?.label).toBe('Đã huỷ');
  });

  it('has no journey before payment, and reads the demo database statuses', () => {
    expect(hasTrackingJourney('PENDING_PAYMENT')).toBe(false);
    expect(hasTrackingJourney('PLACED')).toBe(true);
    expect(normalizeTrackingStatus('PENDING')).toBe('PLACED');
    expect(normalizeTrackingStatus('PICKED_UP')).toBe('COMPLETED');
    expect(normalizeTrackingStatus('READY_FOR_PICKUP')).toBe('READY_FOR_PICKUP');
  });
});
