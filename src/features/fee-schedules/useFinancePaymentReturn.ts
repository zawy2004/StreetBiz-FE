import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useBankTransferPolling } from '@/components/payment';
import { errorMessage, financeApi, type BankTransferDto } from '@/core/api';

const STORAGE_KEY = 'streetbiz.financePayment';
const TRANSFER_KEY = 'streetbiz.financeBankTransfer';

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

export type FinanceBankTransfer = { transactionId: number; details: BankTransferDto };

function rememberTransfer(transactionId: number, path: string) {
  try {
    sessionStorage.setItem(TRANSFER_KEY, JSON.stringify({ transactionId, path } satisfies Pending));
  } catch {
    // Private mode: a reload just shows the wallet choice again.
  }
}

function recallTransfer(path: string): number | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TRANSFER_KEY) ?? 'null') as Pending | null;
    return saved && saved.path === path ? saved.transactionId : null;
  } catch {
    return null;
  }
}

function forgetTransfer() {
  try {
    sessionStorage.removeItem(TRANSFER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * A fee or penalty paid by SePay bank transfer: there is no page to leave for,
 * so the VietQR stays on this page while it checks with the backend every few
 * seconds (SePay's webhook settles the payment there). A reload brings the same
 * QR back. `onPaid` runs once the backend reports SUCCESS.
 */
export function useFinanceBankTransfer(onPaid: () => void) {
  const { pathname } = useLocation();
  const [transfer, setTransfer] = useState<FinanceBankTransfer | null>(null);
  const [checking, setChecking] = useState(false);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  // Reloaded while a transfer was waiting: show its QR again, unless it is settled by now.
  useEffect(() => {
    const transactionId = recallTransfer(pathname);
    if (!transactionId) return;
    let cancelled = false;
    financeApi
      .bankTransfer(transactionId)
      .then((details) => {
        if (!cancelled) setTransfer({ transactionId, details });
      })
      .catch(() => forgetTransfer());
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const start = useCallback(
    (transactionId: number, details: BankTransferDto) => {
      rememberTransfer(transactionId, pathname);
      setClosedMessage(null);
      setTransfer({ transactionId, details });
    },
    [pathname],
  );

  const check = useCallback(async () => {
    if (!transfer || inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const result = await financeApi.syncPayment(transfer.transactionId);
      if (result.status === 'SUCCESS') {
        forgetTransfer();
        setTransfer(null);
        onPaidRef.current();
      } else if (result.status === 'FAILED') {
        forgetTransfer();
        setTransfer(null);
        setClosedMessage(
          'Khoản chuyển khoản này đã bị đóng vì quá lâu chưa nhận được tiền. Nếu bạn đã chuyển, tiền vẫn được ghi nhận khi về; nếu chưa, hãy thanh toán lại.',
        );
      }
    } catch {
      // A failed check is not a failed payment: the next tick asks again.
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [transfer]);

  useBankTransferPolling(transfer !== null, () => void check());

  const cancel = useCallback(() => {
    forgetTransfer();
    setTransfer(null);
  }, []);

  return { transfer, checking, closedMessage, start, check, cancel };
}
