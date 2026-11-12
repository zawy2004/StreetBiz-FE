import { showToast } from '@/components/feedback';
import { safeWebUrl } from '@/core/security/safe-url';

/**
 * Sends the browser to the payment provider. Only a web page is followed: a `javascript:` (or any
 * other non-http) URL would run code in our origin, so it is refused with a message instead.
 * Returns whether the browser is leaving.
 */
export function redirectToPayment(paymentUrl: string): boolean {
  const target = safeWebUrl(paymentUrl);
  if (!target) {
    showToast('Liên kết thanh toán không hợp lệ. Vui lòng thử lại.');
    return false;
  }
  window.location.assign(target);
  return true;
}

/**
 * With no real MoMo/ZaloPay merchant configured, the backend's sandbox gateway
 * returns a `streetbiz://payment/sandbox/...` link. That custom scheme belonged to
 * the old mobile app; a browser silently ignores it, which left orders stuck in
 * PENDING_PAYMENT. The web app handles those links itself instead.
 */
export function isSandboxPaymentUrl(paymentUrl: string): boolean {
  return paymentUrl.startsWith('streetbiz://payment/sandbox/');
}
