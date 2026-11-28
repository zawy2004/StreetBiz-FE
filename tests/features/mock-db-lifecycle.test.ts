import { beforeEach, describe, expect, it } from 'vitest';

import { useMockDb } from '@/mocks/db';

/** Every demo-database action, so the no-server demo behaves like the real flows it imitates. */
const initial = useMockDb.getState();
const db = () => useMockDb.getState();

beforeEach(() => useMockDb.setState(initial, true));

describe('demo database: accounts and penalties', () => {
  it('registers users and vendors, changes passwords, suspends, and edits a penalty rate', () => {
    const user = db().registerUser({
      fullName: 'Mới',
      phone: '0905999999',
      password: 'x',
      role_code: 'CUSTOMER',
      account_status: 'ACTIVE',
    } as never);
    expect(user.id).toMatch(/^USR/);
    db().updateUserPassword(user.id, 'y');
    db().setAccountStatus(user.id, 'SUSPENDED');
    expect(db().users.find((u) => u.id === user.id)).toMatchObject({
      password: 'y',
      account_status: 'SUSPENDED',
    });

    const vendor = db().registerVendor({ business_name: 'Quán mới' } as never);
    expect(db().vendors.at(-1)!.id).toBe(vendor.id);

    const code = db().violationTypes[0]!.code;
    db().updatePenaltyAmount(code, 123);
    expect(db().violationTypes[0]!.default_amount).toBe(123);
    expect(db().violationTypes.slice(1)).toEqual(initial.violationTypes.slice(1));
  });
});

describe('demo database: registrations', () => {
  it('submits, edits, withdraws and decides registrations', () => {
    const reg = db().submitRegistration({ business_name: 'Mới' } as never);
    expect(reg.registration_status).toBe('UNDER_REVIEW');
    db().updateRegistration(reg.id, { business_name: 'Đổi tên' });
    expect(db().registrations.find((r) => r.id === reg.id)!.business_name).toBe('Đổi tên');
    db().withdrawRegistration(reg.id);
    expect(db().registrations.find((r) => r.id === reg.id)!.registration_status).toBe('WITHDRAWN');

    db().approveRegistration('REG-001');
    db().rejectRegistration('REG-002', 'Thiếu');
    expect(db().registrations.find((r) => r.id === 'REG-002')).toMatchObject({
      registration_status: 'REJECTED',
      review_note: 'Thiếu',
    });
    db().requestRegistrationEvidence('REG-001', 'Ảnh mờ');
    expect(db().registrations.find((r) => r.id === 'REG-001')!.registration_status).toBe(
      'MORE_INFORMATION_REQUIRED',
    );
  });
});

describe('demo database: rental lifecycle', () => {
  it('applies, approves into a contract with a permit and a first fee, then renews and returns', () => {
    const slot = db().slots.find((s) => s.slot_status === 'AVAILABLE')!;
    const app = db().submitRentalApplication({ vendorId: 'VEN-001', slotIds: [slot.id] } as never);
    expect(db().slots.find((s) => s.id === slot.id)!.slot_status).toBe('PENDING');

    db().approveRentalApplication(app.id);
    const contract = db().contracts.at(-1)!;
    expect(contract).toMatchObject({
      applicationId: app.id,
      slotId: slot.id,
      contract_status: 'ACTIVE',
    });
    expect(db().permits.at(-1)!.contractId).toBe(contract.id);
    expect(db().feeItems.at(-1)).toMatchObject({ contractId: contract.id, item_status: 'PENDING' });
    expect(db().slots.find((s) => s.id === slot.id)!.slot_status).toBe('RENTED');

    db().requestRenewal(contract.id, '2030-01-01T00:00:00Z');
    const renewal = db().renewals.at(-1)!;
    db().approveRenewal(renewal.id);
    expect(db().contracts.find((c) => c.id === contract.id)!.end_date).toBe('2030-01-01T00:00:00Z');
    expect(db().permits.find((p) => p.contractId === contract.id)!.expires_at).toBe(
      '2030-01-01T00:00:00Z',
    );

    db().returnSlot(contract.id);
    expect(db().contracts.find((c) => c.id === contract.id)!.contract_status).toBe('CLOSED');
    expect(db().slots.find((s) => s.id === slot.id)!.slot_status).toBe('AVAILABLE');
  });

  it('ignores unknown ids, and frees the slot when an application is rejected', () => {
    const before = db();
    db().approveRentalApplication('NOPE');
    db().approveRentalApplication(
      db().submitRentalApplication({ vendorId: 'VEN-001', slotIds: [] } as never).id,
    );
    db().requestRenewal('NOPE', 'x');
    db().approveRenewal('NOPE');
    db().returnSlot('NOPE');
    db().reviewTransfer('NOPE', true);
    db().payFee('NOPE');
    expect(db().contracts).toEqual(before.contracts);
    expect(db().renewals).toEqual(before.renewals);

    const slot = db().slots.find((s) => s.slot_status === 'AVAILABLE')!;
    const app = db().submitRentalApplication({ vendorId: 'VEN-001', slotIds: [slot.id] } as never);
    db().rejectRentalApplication(app.id, 'Không');
    expect(db().applications.find((a) => a.id === app.id)!.application_status).toBe('REJECTED');
    expect(db().slots.find((s) => s.id === slot.id)!.slot_status).toBe('AVAILABLE');
  });

  it('proposes, reviews, adds, edits and removes slots', () => {
    const proposed = db().proposeSlot({ slot_code: 'P-1' } as never);
    db().reviewSlotProposal(proposed.id, true);
    expect(db().slots.find((s) => s.id === proposed.id)).toMatchObject({
      proposal_review_status: 'APPROVED',
      slot_status: 'AVAILABLE',
    });
    const other = db().proposeSlot({ slot_code: 'P-2' } as never);
    db().reviewSlotProposal(other.id, false);
    expect(db().slots.find((s) => s.id === other.id)!.slot_status).toBe('REJECTED');

    const added = db().addSlotToGrid({ slot_code: 'G-1' } as never);
    db().updateSlot(added.id, { slot_code: 'G-2' });
    expect(db().slots.find((s) => s.id === added.id)!.slot_code).toBe('G-2');
    db().removeSlot(added.id);
    expect(db().slots.some((s) => s.id === added.id)).toBe(false);
  });

  it('handles address changes and slot transfers', () => {
    db().requestAddressChange({ vendorId: 'VEN-001', new_address: 'x' } as never);
    const change = db().addressChanges.at(-1)!;
    db().resolveAddressChange(change.id, false);
    expect(db().addressChanges.at(-1)!.change_status).toBe('REJECTED');

    db().initiateTransfer('CON-001', 'VEN-001', '0905000002');
    const transfer = db().transfers.at(-1)!;
    db().acceptTransfer(transfer.id, 'VEN-002');
    expect(db().transfers.at(-1)!.transfer_status).toBe('UNDER_REVIEW');
    db().reviewTransfer(transfer.id, true);
    expect(db().contracts.find((c) => c.id === 'CON-001')!.vendorId).toBe('VEN-002');

    db().initiateTransfer('CON-001', 'VEN-002', '0905000001');
    const refused = db().transfers.at(-1)!;
    db().reviewTransfer(refused.id, false);
    expect(db().transfers.at(-1)!.transfer_status).toBe('REJECTED');
    expect(db().contracts.find((c) => c.id === 'CON-001')!.vendorId).toBe('VEN-002');
  });
});

describe('demo database: money and enforcement', () => {
  it('pays a fee with an invoice, pays a penalty, and records violations with or without a fine', () => {
    db().payFee('FEE-001');
    expect(db().feeItems.find((f) => f.id === 'FEE-001')!.item_status).toBe('PAID');
    expect(db().invoices.at(-1)!.feeItemId).toBe('FEE-001');
    db().payPenalty('PEN-001');
    expect(db().penalties.find((p) => p.id === 'PEN-001')!.penalty_status).toBe('PAID');

    const penalties = db().penalties.length;
    db().recordViolation({ vendorId: 'VEN-001', note: 'Lấn' } as never, 500_000);
    expect(db().penalties).toHaveLength(penalties + 1);
    db().recordViolation({ vendorId: 'VEN-001', note: 'Nhắc' } as never);
    expect(db().penalties).toHaveLength(penalties + 1);
  });

  it('suspends, revokes and reactivates a permit', () => {
    db().suspendPermit('PERMIT-001');
    expect(db().permits[0]!.permit_status).toBe('SUSPENDED');
    db().revokePermit('PERMIT-001');
    expect(db().permits[0]!.permit_status).toBe('REVOKED');
    db().reactivatePermit('PERMIT-001');
    expect(db().permits[0]!.permit_status).toBe('VALID');
  });

  it('takes comments and reports, and resolves a report once', () => {
    db().addComment({ vendorId: 'VEN-001', content: 'Ngon' } as never);
    expect(db().comments.at(-1)!.id).toMatch(/^CMT/);
    db().addReport({ vendorId: 'VEN-001', reason: 'Bẩn' } as never);
    const report = db().reports.at(-1)!;
    expect(report.report_status).toBe('PENDING');
    db().resolveReport(report.id, { resolution: 'DISMISSED', note: 'Không đúng' } as never);
    expect(db().reports.at(-1)!.report_status).toBe('DISMISSED');
    db().resolveReport(report.id, { resolution: 'WARNED', note: 'lại' } as never);
    expect(db().reports.at(-1)!.report_status).toBe('DISMISSED');
  });
});

describe('demo database: account, store, orders and moderation', () => {
  it('marks notifications read and revokes sessions', () => {
    db().markNotificationRead('NOTI-001');
    expect(db().notifications.find((n) => n.id === 'NOTI-001')!.read).toBe(true);
    db().revokeSession('SES-001');
    expect(db().sessions.some((s) => s.id === 'SES-001')).toBe(false);
  });

  it('keeps a price history row only when the board changes', () => {
    const store = db().createStorefront({ name: 'Mới' } as never);
    db().updateStorefront(store.id, { name: 'Đổi' } as never);
    expect(db().storefronts.find((s) => s.id === store.id)!.name).toBe('Đổi');

    const rows = db().priceHistory.length;
    db().addMenuItem({ storefrontId: store.id, name: 'Trà', price: 10_000 } as never);
    const item = db().menuItems.at(-1)!;
    expect(db().priceHistory).toHaveLength(rows + 1);
    db().updateMenuItem(item.id, { isAvailable: false } as never);
    expect(db().priceHistory).toHaveLength(rows + 1);
    db().updateMenuItem(item.id, { price: 12_000 });
    expect(db().priceHistory.at(-1)).toMatchObject({
      change_kind: 'UPDATED',
      previousPrice: 10_000,
      price: 12_000,
    });
    db().updateMenuItem('NOPE', { price: 1 });
    db().removeMenuItem(item.id);
    expect(db().priceHistory.at(-1)).toMatchObject({ change_kind: 'ARCHIVED', isListed: false });
    db().removeMenuItem('NOPE');
    expect(db().priceHistory).toHaveLength(rows + 3);
  });

  it('runs orders, reviews, complaints, reported content and categories', () => {
    const order = db().placeOrder({
      customerId: 'USR-CUS',
      storefrontId: 'STORE-001',
      items: [],
      total: 0,
    } as never);
    db().updateOrderStatus(order.id, 'READY_FOR_PICKUP');
    db().cancelOrder(order.id);
    expect(db().orders.at(-1)!.order_status).toBe('CANCELLED');

    db().addReview({ orderId: order.id, rating: 5 } as never);
    expect(new Date(db().reviews.at(-1)!.editable_until).getTime()).toBeGreaterThan(Date.now());

    db().addComplaint({ orderId: order.id, reason: 'x' } as never);
    const complaint = db().complaints.at(-1)!;
    db().resolveComplaint(complaint.id);
    expect(db().complaints.at(-1)!.status).toBe('RESOLVED');

    db().reportContent({ targetId: 'x' } as never);
    const content = db().reportedContent.at(-1)!;
    db().moderateContent(content.id, true);
    expect(db().reportedContent.at(-1)!.status).toBe('HIDDEN');
    db().moderateContent(content.id, false);
    expect(db().reportedContent.at(-1)!.status).toBe('RESOLVED');

    db().addFoodCategory('Chè');
    const cat = db().foodCategories.at(-1)!;
    expect(cat).toMatchObject({ name: 'Chè', itemCount: 0 });
    db().removeFoodCategory(cat.id);
    expect(db().foodCategories.some((c) => c.id === cat.id)).toBe(false);
  });
});
