import type { WardReceiptDto } from '@/core/api';
import { PROVIDER_LABEL } from '@/features/fee-schedules/finance-view';
import type { StatusTone } from '@/theme';

/**
 * Pure helpers for the ward's "Lịch sử thu". They only filter, count and word receipts the screen
 * has already loaded; nothing here calls the API.
 */

export type ReceiptKindFilter = 'ALL' | 'FEE' | 'PENALTY';

/** A receipt whose money is owed back or was returned: it stays on the list but not in the total. */
export const isReturned = (receipt: Pick<WardReceiptDto, 'paymentStatus'>) =>
  receipt.paymentStatus === 'REFUND_REQUIRED' || receipt.paymentStatus === 'REFUNDED';

/** "payOS", "Nộp Kho bạc", "Tiền mặt"… or that the receipt has no payment record behind it. */
export function methodLabel(provider: string | null): string {
  if (!provider) return 'Không rõ hình thức';
  return PROVIDER_LABEL[provider] ?? provider;
}

/**
 * The reference worded for where it is checked: payOS lists the order code, the Treasury receipt
 * has its own number, anything else is the reference as recorded.
 */
export function referenceLabel(provider: string | null, reference: string | null): string | null {
  if (!reference) return null;
  const payOs = /^PAYOS-(\d+)$/.exec(reference);
  if (provider === 'PAYOS' && payOs) return `Mã đơn payOS ${payOs[1]}`;
  if (provider === 'TREASURY') return `Biên lai Kho bạc ${reference}`;
  return `Mã giao dịch ${reference}`;
}

export function receiptState(receipt: Pick<WardReceiptDto, 'paymentStatus'>): {
  label: string;
  tone: StatusTone;
} {
  if (receipt.paymentStatus === 'REFUND_REQUIRED') return { label: 'Chờ hoàn tiền', tone: 'pending' };
  if (receipt.paymentStatus === 'REFUNDED') return { label: 'Đã hoàn tiền', tone: 'neutral' };
  return { label: 'Đã thu', tone: 'ok' };
}

/** The method filter's choices: every method present in the list, most used first, with counts. */
export function methodOptions(receipts: WardReceiptDto[]) {
  const counts = new Map<string, number>();
  for (const receipt of receipts) {
    const key = receipt.provider ?? 'UNKNOWN';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([value, count]) => ({
      value,
      label: value === 'UNKNOWN' ? methodLabel(null) : methodLabel(value),
      count,
    }));
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

/** Kind, method ('ALL' or a provider, 'UNKNOWN' for none) and a free-text search, accents ignored. */
export function filterReceipts(
  receipts: WardReceiptDto[],
  { kind, method, query }: { kind: ReceiptKindFilter; method: string; query: string },
) {
  const needle = fold(query.trim());
  return receipts.filter((receipt) => {
    if (kind !== 'ALL' && receipt.kind !== kind) return false;
    if (method !== 'ALL' && (receipt.provider ?? 'UNKNOWN') !== method) return false;
    if (!needle) return true;
    const haystack = [
      receipt.payerName,
      receipt.payerPhone,
      receipt.slotCode,
      receipt.invoiceNumber,
      receipt.description,
      receipt.providerReference,
    ]
      .filter(Boolean)
      .join(' ');
    return fold(haystack).includes(needle);
  });
}

/** What the shown receipts took in (money owed back or returned is counted apart). */
export function receiptTotals(receipts: WardReceiptDto[]) {
  let collected = 0;
  let returned = 0;
  let returnedCount = 0;
  for (const receipt of receipts) {
    if (isReturned(receipt)) {
      returned += receipt.amount;
      returnedCount += 1;
    } else {
      collected += receipt.amount;
    }
  }
  return { count: receipts.length, collected, returned, returnedCount };
}

/** "07/11 16:07" in Vietnamese time, the receipt's own moment. */
export function receiptMoment(issuedAt: string): string {
  return new Date(issuedAt).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
