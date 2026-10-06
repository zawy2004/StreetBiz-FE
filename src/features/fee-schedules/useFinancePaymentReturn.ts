import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { errorMessage, financeApi } from '@/core/api';

const STORAGE_KEY = 'streetbiz.financePayment';

type Pending = { transactionId: number; path: string };

/** Called just before leaving for MoMo, so the return trip knows which payment to check. */
export function rememberFinancePayment(transactionId: number, path: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ transactionId, path } satisfies Pending));
  } catch {
    // Private mode: the MoMo orderId in the return URL still identifies the payment.
  }
}

function forget() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The payment to check on this page, if we are back from MoMo: MoMo appends its own
 * `orderId` (ours is `SB-T{transactionId}-{8 hex}`, fresh per attempt because MoMo refuses a
 * repeated one; the bare `SB-T{transactionId}` of older links is still read), else the one
 * remembered before leaving.
 */
function returningTransaction(search: string, path: string): number | null {
  const fromMomo = /^SB-T(\d+)(?:-[0-9a-f]{8})?$/.exec(new URLSearchParams(search).get('orderId') ?? '');
  if (fromMomo) return Number(fromMomo[1]);
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as Pending | null;
    return saved && saved.path === path ? saved.transactionId : null;
  } catch {
    return null;
  }
}

export type FinanceReturnState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'pending'; transactionId: number }
  | { phase: 'failed'; message: string };

/**
 * On a fee/penalty payment page, when the vendor comes back from MoMo: ask the backend
 * to check with MoMo (the URL's result parameters are not trusted) and report the outcome.
 * `onSuccess` runs once when MoMo confirms the payment.
 */
export function useFinancePaymentReturn(onSuccess: () => void) {
  const { search, pathname } = useLocation();
  const [state, setState] = useState<FinanceReturnState>({ phase: 'idle' });
  const started = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const check = useCallback(async (transactionId: number) => {
    setState({ phase: 'checking' });
    try {
      const result = await financeApi.syncPayment(transactionId);
      if (result.status === 'SUCCESS') {
        forget();
        setState({ phase: 'idle' });
        onSuccessRef.current();
      } else if (result.status === 'FAILED') {
        forget();
        setState({
          phase: 'failed',
          message: 'MoMo báo giao dịch không thành công. Bạn có thể thanh toán lại.',
        });
      } else {
        setState({ phase: 'pending', transactionId });
      }
    } catch (error) {
      setState({ phase: 'failed', message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    const transactionId = returningTransaction(search, pathname);
    if (transactionId) {
      started.current = true;
      void check(transactionId);
    }
  }, [search, pathname, check]);

  return { state, retry: (transactionId: number) => void check(transactionId) };
}
