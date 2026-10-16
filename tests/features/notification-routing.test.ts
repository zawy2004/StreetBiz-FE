import { describe, expect, it } from 'vitest';

import {
  notificationTarget,
  notificationVisual,
  splitByRecency,
} from '@/features/notifications/notification-routing';
import type { NotificationItem } from '@/features/notifications/notifications-api';

function note(type: string, entityType: string | null, entityId: number | null): NotificationItem {
  return { id: 1, type, title: 't', body: 'b', entityType, entityId, read: false, sentAt: '2026-10-01T00:00:00Z' };
}

describe('notificationTarget', () => {
  it('opens the order on the side that received it', () => {
    expect(notificationTarget(note('ORDER', 'ORDER', 42), 'CUSTOMER')).toBe('/customer/orders/42');
    expect(notificationTarget(note('ORDER', 'OrderArrivalAck', 42), 'CUSTOMER')).toBe('/customer/orders/42');
    expect(notificationTarget(note('ORDER', 'ORDER', 42), 'VENDOR')).toBe('/vendor/orders/42');
    expect(notificationTarget(note('ORDER', 'OrderArrival', 42), 'VENDOR')).toBe('/vendor/orders/42');
  });

  it('sends a vendor to the screen that owns each workflow', () => {
    const vendor = (type: string, entity: string, id = 7) => notificationTarget(note(type, entity, id), 'VENDOR');
    expect(vendor('FEE', 'FeeScheduleItem')).toBe('/vendor/finance');
    expect(vendor('FEE', 'RentalContract')).toBe('/vendor/finance/contracts/7');
    expect(vendor('PERMIT_ISSUED', 'RentalContract')).toBe('/vendor/slots/contracts/7');
    expect(vendor('FEE', 'PaymentTransaction')).toBe('/vendor/finance/payments');
    expect(vendor('PENALTY_OVERDUE', 'Penalty')).toBe('/vendor/finance/violations');
    expect(vendor('PENALTY_SANCTION_ISSUED', 'Violation')).toBe('/vendor/finance/violations');
    expect(vendor('ENROLLMENT_STATUS_UPDATE', 'BusinessRegistration')).toBe('/vendor/registrations/7');
    expect(vendor('PERMIT_APPLICATION_REJECTED', 'RentalApplication')).toBe('/vendor/slots/rental-applications/7');
    expect(vendor('RENEWAL_APPROVED', 'RenewalRequest')).toBe('/vendor/slots/contracts');
    expect(vendor('PERMIT_STATUS_SUSPENDED', 'DigitalPermit')).toBe('/vendor/slots/contracts');
    expect(vendor('WARD_REVIEW', 'proposals')).toBe('/vendor/slots/7');
    expect(vendor('WARD_REVIEW', 'conflicts')).toBe('/vendor/registrations');
    expect(vendor('WARD_REVIEW', 'transfers')).toBe('/vendor/slots/transfers');
    expect(vendor('SLOT_PRICE_CHANGED', 'SidewalkSlot')).toBe('/vendor/slots/7');
    expect(vendor('ZONE_PRICE_CHANGED', 'PricingZone')).toBe('/vendor/slots/mine');
    expect(vendor('FOOD_SAFETY', 'food-safety')).toBe('/vendor/store/food-safety');
  });

  it('reads the capitalised entity names of the demo seed too', () => {
    expect(notificationTarget(note('ENROLLMENT_STATUS_UPDATE', 'REGISTRATION', 4), 'VENDOR')).toBe('/vendor/registrations/4');
    expect(notificationTarget(note('PERMIT_ISSUED', 'CONTRACT', 4), 'VENDOR')).toBe('/vendor/slots/contracts/4');
    expect(notificationTarget(note('PENALTY_SANCTION_ISSUED', 'PENALTY', 4), 'VENDOR')).toBe('/vendor/finance/violations');
    expect(notificationTarget(note('WARD_REVIEW', 'REGISTRATION', 4), 'WARD_AUTHORITY')).toBe('/ward/inbox/registrations/4');
  });

  it('never routes a role into a screen it cannot open', () => {
    // A customer's report was closed: the moderation screen is the admin's.
    expect(notificationTarget(note('CONTENT_MODERATION', 'ReportedContent', 3), 'CUSTOMER')).toBeNull();
    // Vendor-only notices mean nothing to the ward or the platform admin.
    expect(notificationTarget(note('FEE', 'FeeScheduleItem', 3), 'WARD_AUTHORITY')).toBeNull();
    expect(notificationTarget(note('ORDER', 'ORDER', 3), 'PLATFORM_ADMIN')).toBeNull();
    expect(notificationTarget(note('UNKNOWN', null, null), 'VENDOR')).toBeNull();
  });

  it('opens the sessions screen for a security alert, whatever the role', () => {
    for (const role of ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'] as const) {
      expect(notificationTarget(note('SECURITY_ALERT', 'UserAccount', 1), role)).toBe('/account/sessions');
    }
  });
});

describe('notificationVisual', () => {
  it('marks bad news red and falls back to a plain bell', () => {
    expect(notificationVisual(note('PERMIT_STATUS_SUSPENDED', null, null)).tone).toBe('error');
    expect(notificationVisual(note('PERMIT_ISSUED', null, null)).tone).toBe('success');
    expect(notificationVisual(note('SOMETHING_NEW', null, null))).toEqual({ icon: 'bell-outline', tone: 'neutral' });
  });
});

describe('splitByRecency', () => {
  it('puts the last 24 hours under "Mới"', () => {
    const now = new Date('2026-10-02T12:00:00Z');
    const { recent, earlier } = splitByRecency(
      [{ sentAt: '2026-10-02T08:00:00Z' }, { sentAt: '2026-09-30T08:00:00Z' }, { sentAt: 'bad' }],
      now,
    );
    expect(recent).toHaveLength(1);
    expect(earlier).toHaveLength(2);
  });
});
