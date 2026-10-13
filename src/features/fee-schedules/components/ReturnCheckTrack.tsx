import { Button, Icon, type IconName } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import type { FinanceReturnState } from '../useFinancePaymentReturn';

type Props = {
  state: FinanceReturnState;
  onRetry: (transactionId: number) => void;
};

type StopLook = { icon: IconName; disc: string; ping?: boolean };

/**
 * Back from the wallet: three stops, "Đã mở cổng ví" → "Ví xác nhận" →
 * "StreetBiz ghi nhận". The last stop never lights up here: once the server
 * confirms, the page leaves with a toast, so nothing on this page can claim a
 * payment went through. The words under the track are the same as before, in
 * the same `status` / `alert` live regions.
 */
export function ReturnCheckTrack({ state, onRetry }: Props) {
  if (state.phase === 'idle') return null;

  const wallet: StopLook =
    state.phase === 'checking'
      ? { icon: 'circle-outline', disc: VERDICT_TONES.neutral.wash, ping: true }
      : state.phase === 'pending'
        ? { icon: 'timer-outline', disc: VERDICT_TONES.pending.wash }
        : { icon: 'close-circle-outline', disc: VERDICT_TONES.danger.wash };
  const walletInk =
    state.phase === 'checking'
      ? VERDICT_TONES.neutral.ink
      : state.phase === 'pending'
        ? VERDICT_TONES.pending.ink
        : VERDICT_TONES.danger.ink;
  const frame =
    state.phase === 'pending'
      ? 'ring-[#FFB703]/50'
      : state.phase === 'failed'
        ? 'ring-[#B42318]/30'
        : 'ring-border';

  return (
    <section
      aria-label="Kiểm tra thanh toán với ví"
      className={`rounded-[20px] bg-card p-md shadow-card ring-1 md:p-lg ${frame}`}
    >
      <ol aria-hidden="true" className="flex items-start">
        <Stop
          label="Đã mở cổng ví"
          look={{ icon: 'send-outline', disc: VERDICT_TONES.ok.wash }}
          ink={VERDICT_TONES.ok.ink}
        />
        <Connector done />
        <Stop label="Ví xác nhận" look={wallet} ink={walletInk} />
        <Connector />
        <Stop
          label="StreetBiz ghi nhận"
          look={{ icon: 'cloud-check-outline', disc: 'bg-sunken' }}
          ink="text-muted"
        />
      </ol>

      <div key={state.phase} className="sb-pop mt-md">
        {state.phase === 'checking' ? (
          <p
            role="status"
            className={`rounded-[12px] px-sm py-xs text-body-lg ${VERDICT_TONES.neutral.wash} ${VERDICT_TONES.neutral.ink}`}
          >
            Đang kiểm tra kết quả thanh toán với MoMo…
          </p>
        ) : null}
        {state.phase === 'pending' ? (
          <div
            role="status"
            className={`flex flex-col gap-sm rounded-[14px] p-sm md:flex-row md:items-center md:justify-between md:p-md ${VERDICT_TONES.pending.wash}`}
          >
            <div className={`min-w-0 ${VERDICT_TONES.pending.ink}`}>
              <p className="text-[16px] font-bold leading-6">MoMo chưa xác nhận thanh toán</p>
              <p className="mt-2xs text-body-md">
                Nếu bạn đã thanh toán, bấm kiểm tra lại sau vài giây.
              </p>
              <p className="mt-2xs text-body-sm">
                Mã giao dịch{' '}
                <span className="font-sign font-bold tracking-[0.02em] tabular-nums">
                  SB-T{state.transactionId}
                </span>
              </p>
            </div>
            <div className="w-full shrink-0 md:w-auto">
              <Button
                label="Kiểm tra lại"
                variant="outline"
                icon={<Icon name="history" size={18} color="currentColor" />}
                onPress={() => state.phase === 'pending' && onRetry(state.transactionId)}
              />
            </div>
          </div>
        ) : null}
        {state.phase === 'failed' ? (
          <p
            role="alert"
            className={`flex items-start gap-xs rounded-[12px] px-sm py-xs text-body-lg ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
          >
            <Icon
              name="close-circle-outline"
              size={20}
              color="currentColor"
              className="mt-[3px] shrink-0"
            />
            <span>{state.message}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Stop({ label, look, ink }: { label: string; look: StopLook; ink: string }) {
  return (
    <li className="flex w-[84px] shrink-0 flex-col items-center gap-1 text-center sm:w-[112px]">
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-full ${look.disc} ${ink}`}
      >
        {look.ping ? (
          <>
            <span className="sb-ping absolute inset-0 rounded-full bg-[#2B3640]/15" />
            <span className="h-3 w-3 rounded-full bg-current" />
          </>
        ) : (
          <Icon name={look.icon} size={20} color="currentColor" />
        )}
      </span>
      <span className={`text-body-sm font-semibold leading-tight ${ink}`}>{label}</span>
    </li>
  );
}

function Connector({ done }: { done?: boolean }) {
  return (
    <li className="mt-5 h-0.5 min-w-4 flex-1 rounded-full">
      <span className={`block h-full rounded-full ${done ? 'bg-[#0B7F43]' : 'bg-border'}`} />
    </li>
  );
}
