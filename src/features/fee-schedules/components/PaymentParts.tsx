import { useId, type ReactNode } from 'react';

import { formatVnd, Icon, KerbTag, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { PaymentProvider } from '@/core/api';
import { feeUrgency } from '../finance-view';
import { TearLine, WalletChannelLine } from './FinanceParts';
import {
  EASE_OUT,
  INK,
  PAPER_SHADOW,
  TEETH_BOTTOM_MASK,
  riseDelay,
  useEntered,
} from './finance-styles';

/* ------------------------------------------------------------------------ */
/* Wallet cards                                                              */
/* ------------------------------------------------------------------------ */

const WALLETS: { value: PaymentProvider; label: string; description: string }[] = [
  { value: 'MOMO', label: 'MoMo', description: 'Thanh toán qua ví MoMo' },
  { value: 'ZALOPAY', label: 'ZaloPay', description: 'Thanh toán qua ví ZaloPay' },
];

/**
 * The finance pages' own copy of the wallet choice, drawn as two large cards
 * (the buyer checkout keeps `PaymentProviderSelector`). Same fieldset, legend,
 * radio name, labels, descriptions and default as that selector. The wallet
 * names are words only: the project has no wallet logo assets.
 */
export function WalletPicker({
  value,
  onChange,
  disabled,
}: {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-sm font-sign text-[18px] font-bold leading-6 text-text">
        Phương thức thanh toán
      </legend>
      <div className="grid grid-cols-2 gap-sm">
        {WALLETS.map((wallet) => {
          const chosen = value === wallet.value;
          return (
            <label
              key={wallet.value}
              className={[
                'relative flex min-h-20 cursor-pointer flex-col justify-center gap-1 rounded-[16px] px-sm py-sm transition-[box-shadow,background-color,transform] duration-150 active:scale-[.98] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary md:px-md',
                chosen
                  ? 'bg-[#FFF8F3] shadow-[0_10px_24px_-16px_rgb(var(--c-brand)/0.9)] ring-2 ring-brand dark:bg-[rgb(255_138_76/0.08)]'
                  : 'bg-card shadow-card ring-1 ring-border hover:ring-text/25',
                disabled ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              <span
                className={`flex items-center gap-xs font-sign text-[20px] font-bold leading-6 text-text ${disabled ? 'opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentProvider"
                  value={wallet.value}
                  checked={chosen}
                  disabled={disabled}
                  onChange={() => onChange(wallet.value)}
                  className="h-5 w-5 shrink-0 accent-[rgb(var(--c-primary))]"
                />
                {wallet.label}
              </span>
              <span className={`text-body-sm text-muted ${disabled ? 'opacity-50' : ''}`}>
                {wallet.description}
              </span>
              {chosen ? (
                <span
                  aria-hidden="true"
                  className="sb-pop absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-card"
                >
                  <Icon name="check" size={14} color="currentColor" />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A checkout error under the wallet cards, read out at once. */
export function CheckoutError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-lg dark:bg-[#3A1414] ${INK.danger}`}
    >
      <Icon
        name="alert-circle-outline"
        size={20}
        color="currentColor"
        className="mt-[3px] shrink-0"
      />
      <span>{message}</span>
    </p>
  );
}

/* ------------------------------------------------------------------------ */
/* V26: the fee slip                                                         */
/* ------------------------------------------------------------------------ */

type FeeSlipProps = {
  periodLabel: string;
  amount: number;
  dueDate: string;
  slotCode?: string | null;
  status?: string;
};

/**
 * "Phiếu thu phí ô": a white slip rising off the painted kerb, a torn ticket
 * edge at the bottom, the slot plate, period, the amount large, the due date
 * and how late it is, a tear line, and the wallet line it is paid through.
 * The status chip is whatever the server says the instalment is.
 */
export function FeeSlip({ periodLabel, amount, dueDate, slotCode, status }: FeeSlipProps) {
  const entered = useEntered();
  const urgency = status ? feeUrgency({ dueDate, itemStatus: status }) : null;
  return (
    <div className="sb-rise min-w-0 max-w-[640px]" style={PAPER_SHADOW}>
      <section
        aria-label="Khoản phí cần thanh toán"
        className="relative overflow-hidden rounded-t-[20px] bg-card pb-lg"
        style={TEETH_BOTTOM_MASK}
      >
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
        <div className="flex flex-col gap-sm px-md pt-md md:px-lg md:pt-lg">
          <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
            <span className="text-body-sm font-semibold text-muted">Phí thuê ô</span>
            {slotCode ? <KerbTag code={slotCode} /> : null}
            {status ? (
              <span className="ml-auto">
                <StatusChip code={status} />
              </span>
            ) : null}
          </div>
          <p className="line-clamp-2 font-sign text-[20px] font-semibold leading-[26px] text-text">
            {periodLabel}
          </p>
          <Amount value={amount} />
          <p className="text-body-lg text-text">
            <span>Hạn thanh toán {new Date(dueDate).toLocaleDateString('vi-VN')}</span>
            {urgency ? (
              <span className={`font-bold ${INK[urgency.tone]}`}>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{urgency.text}</span>
              </span>
            ) : null}
          </p>
        </div>
        <TearLine entered={entered} />
        <div className="px-md md:px-lg">
          <WalletChannelLine />
        </div>
      </section>
    </div>
  );
}

function Amount({ value }: { value: number }) {
  return (
    <p className="whitespace-nowrap font-sign text-[clamp(34px,11vw,44px)] font-bold leading-[1.05] tracking-[-0.01em] tabular-nums text-text [font-stretch:88%] md:text-[64px]">
      {formatVnd(value)}
    </p>
  );
}

/* ------------------------------------------------------------------------ */
/* V27: the penalty notice                                                   */
/* ------------------------------------------------------------------------ */

type NoticeProps = {
  violationLabel: string;
  amount: number;
  slotCode?: string | null;
  issuedAt?: string;
  status?: string;
};

/**
 * "Tấm biên bản trên bàn cán bộ": ruled paper with a red margin drawn down its
 * left edge, the slot and date it was written, what for, and how much. Not a
 * ticket stub like the fee slip: this records something that happened.
 */
export function PenaltyNotice({ violationLabel, amount, slotCode, issuedAt, status }: NoticeProps) {
  const titleId = useId();
  const entered = useEntered();
  return (
    <article
      aria-labelledby={titleId}
      className="relative min-w-0 max-w-[640px] overflow-hidden rounded-[16px] bg-card shadow-sheet ring-1 ring-border/80"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0 31px, rgb(var(--c-sunken)) 31px 32px)',
      }}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 origin-top bg-[#B42318] transition-transform duration-[600ms] dark:bg-[#E5534B] ${entered ? 'scale-y-100' : 'scale-y-0'}`}
        style={EASE_OUT}
      />
      <div className="flex flex-col gap-md py-md pl-lg pr-md md:py-lg md:pl-xl md:pr-lg">
        <header className="sb-rise flex flex-col gap-xs" style={riseDelay(120)}>
          <div className="flex flex-wrap items-center justify-between gap-xs">
            <h2
              id={titleId}
              className="flex items-center gap-xs font-sign text-[15px] font-semibold leading-[22px] text-text"
            >
              <span className={INK.danger}>
                <Icon name="gavel" size={20} color="currentColor" />
              </span>
              Biên bản phạt
            </h2>
            {status ? <StatusChip code={status} /> : null}
          </div>
          {slotCode || issuedAt ? (
            <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-lg text-text">
              <span className="text-muted">
                <Icon name="map-marker-outline" size={18} color="currentColor" />
              </span>
              {slotCode ? <KerbTag code={slotCode} /> : null}
              {issuedAt ? (
                <span>Lập ngày {new Date(issuedAt).toLocaleDateString('vi-VN')}</span>
              ) : null}
            </p>
          ) : null}
        </header>

        <div className="sb-rise" style={riseDelay(200)}>
          <p className="text-body-sm text-muted">Hành vi vi phạm</p>
          <p
            title={violationLabel}
            className="mt-1 line-clamp-3 font-sign text-[22px] font-semibold leading-7 text-text md:text-[24px] md:leading-[30px]"
          >
            {violationLabel}
          </p>
        </div>

        <div className="sb-rise border-t border-border pt-md" style={riseDelay(280)}>
          <p className="text-body-sm text-muted">Số tiền phạt</p>
          <Amount value={amount} />
        </div>

        <WalletChannelLine />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------------ */
/* Side notes                                                                */
/* ------------------------------------------------------------------------ */

const SAFE_STEPS: { icon: IconName; text: string }[] = [
  { icon: 'wallet-outline', text: 'Chọn ví và bấm thanh toán.' },
  { icon: 'send-outline', text: 'Xác nhận trong ứng dụng ví.' },
  {
    icon: 'cloud-check-outline',
    text: 'Quay lại StreetBiz: hệ thống hỏi lại ví rồi mới ghi nhận và xuất hoá đơn.',
  },
];

/** "Thanh toán an toàn trong 3 bước": why there is a check step on the way back. */
export function SafePaySteps() {
  return (
    <SideNote title="Thanh toán an toàn trong 3 bước" icon="shield-check-outline">
      <ol className="flex flex-col gap-sm">
        {SAFE_STEPS.map((step, i) => (
          <li key={step.text} className="flex items-start gap-sm">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-primary font-sign text-[15px] font-bold text-primary"
            >
              {i + 1}
            </span>
            <span className="pt-1 text-body-md text-text">{step.text}</span>
          </li>
        ))}
      </ol>
    </SideNote>
  );
}

/** "Về biên bản này": who decides the fine and when the notice changes state. */
export function PenaltyNote() {
  return (
    <SideNote title="Về biên bản này" icon="information-outline">
      <p className="text-body-md text-text">
        Mức phạt do Cán bộ Phường quyết định theo biểu mức phạt của phường. Biên bản chuyển sang Đã
        thanh toán sau khi hệ thống nhận xác nhận từ ví.
      </p>
    </SideNote>
  );
}

function SideNote({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] bg-card p-md ring-1 ring-border/80">
      <h2 className="mb-sm flex items-center gap-xs text-[16px] font-bold leading-6 text-text">
        <span className="text-tertiary">
          <Icon name={icon} size={20} color="currentColor" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The bottom bar: the amount said again beside the one payment button. */
export function PayBar({ amount, children }: { amount: number; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-xs sm:flex-row sm:items-center sm:justify-end sm:gap-md">
      <p className="flex items-baseline justify-between gap-sm sm:block sm:text-right">
        <span className="text-body-sm text-muted sm:block">Số tiền thanh toán</span>
        <span className="font-sign text-[18px] font-bold leading-6 tabular-nums text-text">
          {formatVnd(amount)}
        </span>
      </p>
      <div className="w-full sm:w-[320px] [&>button]:min-h-14 [&>button]:text-[16px]">
        {children}
      </div>
    </div>
  );
}
