import { vi } from 'vitest';

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiGetBlob: vi.fn(),
}));

vi.mock('@/core/api/client', () => client);

import { commerceApi } from '@/core/api/commerce-api';
import { financeApi } from '@/core/api/finance-api';
import { vendorPayoutApi, wardPayoutApi } from '@/core/api/payout-account-api';
import { wardFinanceApi } from '@/features/ward-administration/ward-finance-api';
import {
  isBankTransferProvider,
  payButtonLabel,
  PROVIDER_LABEL,
} from '@/features/fee-schedules/finance-view';

/** The payOS model: pay straight to the payee; fines go to the State Treasury, not through StreetBiz. */

beforeEach(() => vi.clearAllMocks());

describe('payment options by payee', () => {
  it('reads the methods of one fee and of one stall from their own endpoints', async () => {
    client.apiGet.mockResolvedValue({});

    await financeApi.feePaymentOptions(7);
    await commerceApi.storefrontPaymentOptions(2);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, '/vendor/finance/fees/7/payment-options');
    expect(client.apiGet).toHaveBeenNthCalledWith(2, '/orders/storefronts/2/payment-options');
  });
});

describe('fines are paid to the Treasury', () => {
  it('has no online checkout for a penalty any more', () => {
    expect(financeApi).not.toHaveProperty('payPenaltyCheckout');
  });

  it('reads how to pay and sends the receipt for the ward to check', async () => {
    client.apiGet.mockResolvedValue({});
    client.apiPost.mockResolvedValue({});
    const body = { receiptUrl: '/api/uploads/evidence/7/a.jpg', reference: 'KB-1', paidOn: '2026-11-02', note: null };

    await financeApi.penaltyTreasury(4);
    await financeApi.submitPenaltyReceipt(4, body);

    expect(client.apiGet).toHaveBeenCalledWith('/vendor/finance/penalties/4/treasury');
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/finance/penalties/4/receipts', body);
  });

  it('lets the ward list, accept, reject and annul', async () => {
    client.apiGet.mockResolvedValue([]);
    client.apiPost.mockResolvedValue({ message: 'ok' });

    await wardFinanceApi.penaltyReceipts();
    await wardFinanceApi.penaltyReceipts('SUBMITTED');
    await wardFinanceApi.acceptPenaltyReceipt(21, 'Khớp');
    await wardFinanceApi.rejectPenaltyReceipt(21, 'Ảnh mờ');
    await wardFinanceApi.annulPaidPenalty(3, 'Huỷ theo khiếu nại');

    expect(client.apiGet).toHaveBeenNthCalledWith(1, '/ward/finance/penalty-receipts');
    expect(client.apiGet).toHaveBeenNthCalledWith(2, '/ward/finance/penalty-receipts?status=SUBMITTED');
    expect(client.apiPost).toHaveBeenNthCalledWith(1, '/ward/finance/penalty-receipts/21/accept', {
      note: 'Khớp',
    });
    expect(client.apiPost).toHaveBeenNthCalledWith(2, '/ward/finance/penalty-receipts/21/reject', {
      reason: 'Ảnh mờ',
    });
    expect(client.apiPost).toHaveBeenNthCalledWith(3, '/ward/finance/penalties/3/annul', {
      reason: 'Huỷ theo khiếu nại',
    });
  });
});

describe('receiving accounts', () => {
  const keys = { clientId: 'c', apiKey: 'k', checksumKey: 's' };

  it("keeps a household's and a ward's accounts on their own endpoints", async () => {
    client.apiGet.mockResolvedValue({});
    client.apiPut.mockResolvedValue({});
    client.apiPost.mockResolvedValue({});
    client.apiDelete.mockResolvedValue({});

    await vendorPayoutApi.get();
    await vendorPayoutApi.connect(keys);
    await vendorPayoutApi.check();
    await vendorPayoutApi.disconnect();
    await wardPayoutApi.get();
    await wardPayoutApi.connect(keys);
    await wardPayoutApi.check();
    await wardPayoutApi.disconnect();

    expect(client.apiGet.mock.calls.map(([url]) => url)).toEqual([
      '/vendor/payout-account',
      '/ward/payout-account',
    ]);
    expect(client.apiPut.mock.calls).toEqual([
      ['/vendor/payout-account', keys],
      ['/ward/payout-account', keys],
    ]);
    expect(client.apiPost.mock.calls.map(([url]) => url)).toEqual([
      '/vendor/payout-account/check',
      '/ward/payout-account/check',
    ]);
    expect(client.apiDelete.mock.calls.map(([url]) => url)).toEqual([
      '/vendor/payout-account',
      '/ward/payout-account',
    ]);
  });
});

describe('payment wording', () => {
  it('shows a VietQR for a bank transfer by SePay or payOS and a wallet page for the rest', () => {
    expect(isBankTransferProvider('PAYOS')).toBe(true);
    expect(isBankTransferProvider('SEPAY')).toBe(true);
    expect(isBankTransferProvider('MOMO')).toBe(false);
    expect(isBankTransferProvider(undefined)).toBe(false);

    expect(payButtonLabel('PAYOS', false, false)).toBe('Tạo mã chuyển khoản VietQR');
    expect(payButtonLabel('SEPAY', false, false)).toBe('Tạo mã chuyển khoản VietQR');
    expect(payButtonLabel('ZALOPAY', false, false)).toBe('Thanh toán qua MoMo / ZaloPay');
    expect(payButtonLabel('PAYOS', true, false)).toBe('Đang khởi tạo thanh toán…');
    expect(payButtonLabel('PAYOS', false, true)).toBe('Đang chờ chuyển khoản…');
  });

  it('says nothing can be paid when no method is offered', () => {
    expect(payButtonLabel(undefined, false, false)).toBe('Chưa có phương thức thanh toán');
  });

  it('names every way a payment can have been made, including the Treasury', () => {
    expect(PROVIDER_LABEL.PAYOS).toBe('Chuyển khoản VietQR (payOS)');
    expect(PROVIDER_LABEL.TREASURY).toBe('Nộp Kho bạc');
    expect(PROVIDER_LABEL.CASH).toBe('Tiền mặt');
    expect(PROVIDER_LABEL.MOMO).toBe('MoMo');
  });
});
