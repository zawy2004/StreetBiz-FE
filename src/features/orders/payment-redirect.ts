export function redirectToPayment(paymentUrl: string): void {
  window.location.assign(paymentUrl);
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
