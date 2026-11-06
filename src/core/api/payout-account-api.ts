import { apiDelete, apiGet, apiPost, apiPut } from './client';

/**
 * Mirrors StreetBiz-BE `PayoutAccountsController`: the receiving account a household (its orders)
 * or a ward (its rental fees) connects, so payers pay straight into it and StreetBiz never holds
 * the money. The account is a payOS channel; its three keys are sent once and never returned.
 */

export type PayoutAccountStatus = 'ACTIVE' | 'ERROR' | 'DISABLED';

export type PayoutAccountDto = {
  connected: boolean;
  status: PayoutAccountStatus | null;
  provider: string;
  /** The account payOS reported the money lands in; the number is masked. */
  bankName: string | null;
  accountNumberMasked: string | null;
  accountName: string | null;
  clientIdMasked: string | null;
  /** payOS has been given the webhook URL and answered it. Without it, payments are found by asking payOS. */
  webhookConfirmed: boolean;
  /** The server knows a public address to give payOS (false: local development without a tunnel). */
  webhookConfigured: boolean;
  lastCheckedAt: string | null;
  /** Why the account is in ERROR (payOS refused the keys). */
  lastError: string | null;
  connectedAt: string | null;
  updatedAt: string | null;
};

export type ConnectPayoutAccountBody = {
  clientId: string;
  apiKey: string;
  checksumKey: string;
};

function client(base: string) {
  return {
    get: () => apiGet<PayoutAccountDto>(base),
    /** Connects the channel or replaces its keys; payOS must accept them first (422 otherwise). */
    connect: (body: ConnectPayoutAccountBody) => apiPut<PayoutAccountDto>(base, body),
    /** Asks payOS again with the stored keys; refused keys put the account in ERROR. */
    check: () => apiPost<PayoutAccountDto>(`${base}/check`),
    /** Stops new payments; the keys stay so late webhooks of earlier payments still verify. */
    disconnect: () => apiDelete<PayoutAccountDto>(base),
  };
}

export const vendorPayoutApi = client('/vendor/payout-account');
export const wardPayoutApi = client('/ward/payout-account');
export type PayoutAccountApi = ReturnType<typeof client>;
