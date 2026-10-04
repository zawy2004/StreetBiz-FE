import { ReactNode } from 'react';

import { Button, formatVnd, Icon, KerbTag } from '@/components/common';
// Imported directly, not from the barrel, so qrcode.react stays out of the entry chunk.
import { QrCode } from '@/components/common/QrCode';
import { colors } from '@/theme';

/**
 * The top of the vendor home: the one fact about the vendor's legal standing
 * that matters today, on the night surface the landing page uses. Which fact is
 * decided by `pickStanding`; this file only draws it.
 */
function NightPanel({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    // `dark` makes the panel a dark-theme island: every token inside (Kerb Tag,
    // status inks, the button) resolves to its dark value, whatever the app theme.
    <section
      aria-labelledby={labelledBy}
      className="dark relative isolate overflow-hidden rounded-lg border border-white/10 bg-[#0E1013] p-lg text-white md:px-xl"
    >
      {/* Street-lamp glow and the pavement dot grid, both borrowed from the landing hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-40 -z-10 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgb(228_68_31/0.36),transparent)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="sb-dot-grid pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_left,black,transparent_75%)]"
      />
      {children}
    </section>
  );
}

/** Holds the hero's place while its sources load, so the page never jumps when it lands. */
export function HeroSkeleton() {
  return (
    <div aria-busy="true" className="rounded-lg border border-white/10 bg-[#0E1013] p-lg md:px-xl">
      <span className="sr-only">Đang tải tình trạng giấy phép</span>
      <div aria-hidden="true" className="flex flex-col gap-sm">
        <div className="h-4 w-32 animate-pulse rounded-sm bg-white/10" />
        <div className="h-8 w-3/5 animate-pulse rounded-sm bg-white/10" />
        <div className="mt-sm h-12 w-full animate-pulse rounded-sm bg-white/10 sm:w-[200px]" />
      </div>
    </div>
  );
}

type StatusTone = 'danger' | 'pending' | 'ok';

const LEAD_CLASS: Record<StatusTone, string> = {
  danger: 'text-error',
  pending: 'text-on-secondary',
  ok: 'text-tertiary-ink',
};

type StatusProps = {
  tone: StatusTone;
  /** Short line above the title saying what this means for selling: "Không được bán tại ô này". */
  lead: string;
  title: string;
  /** Slot and date, or the ward's reason. */
  meta?: ReactNode;
  action?: { label: string; onPress: () => void };
  /** Quiet line under the action, e.g. who to contact. */
  note?: string;
};

/** Every standing that is not money and not the valid permit: one fact, at most one action. */
export function StatusHero({ tone, lead, title, meta, action, note }: StatusProps) {
  return (
    <NightPanel labelledBy="home-hero-status">
      <p className={`text-body-lg font-semibold ${LEAD_CLASS[tone]}`}>{lead}</p>
      <h2 id="home-hero-status" className="mt-2xs text-display-md md:text-display-lg">
        {title}
      </h2>
      {meta ? (
        <div className="mt-sm flex flex-wrap items-center gap-xs text-body-lg text-white/70">
          {meta}
        </div>
      ) : null}
      {action ? (
        <div className="mt-lg [&>button]:w-full sm:[&>button]:w-auto sm:[&>button]:min-w-[200px]">
          <Button label={action.label} fullWidth={false} onPress={action.onPress} />
        </div>
      ) : null}
      {note ? <p className="mt-xs text-body-sm text-white/60">{note}</p> : null}
    </NightPanel>
  );
}

type DebtProps = {
  amount: number;
  /** `danger` when anything is overdue; `pending` when everything is only due soon. */
  tone: 'danger' | 'pending';
  /** The deadline that matters most: "Quá hạn 19 ngày", "Còn 7 ngày · hạn 11/10". */
  urgency: string;
  /** "2 kỳ phí quá hạn · 1 biên bản phạt": what the amount is made of. */
  breakdown: string;
  /** Names the one item the button pays: "Trả phí tháng 09/2026". */
  payLabel: string;
  onPay: () => void;
  /** Payable items left after this one; they are in the list below. */
  remaining: number;
};

export function DebtHero({
  amount,
  tone,
  urgency,
  breakdown,
  payLabel,
  onPay,
  remaining,
}: DebtProps) {
  return (
    <NightPanel labelledBy="home-hero-debt">
      <p
        className={`text-body-lg font-semibold ${tone === 'danger' ? 'text-error' : 'text-on-secondary'}`}
      >
        {urgency}
      </p>
      {/* Overdue money is not a reward: white, not turmeric. Turmeric stays for "due soon". */}
      <h2 id="home-hero-debt" className="mt-2xs text-display-md md:text-display-lg">
        Cần trả{' '}
        <span className={`font-tabular ${tone === 'danger' ? 'text-white' : 'text-secondary'}`}>
          {formatVnd(amount)}
        </span>
      </h2>
      <p className="mt-xs text-body-lg text-white/70">{breakdown}</p>
      <div className="mt-lg [&>button]:w-full sm:[&>button]:w-auto sm:[&>button]:min-w-[200px]">
        <Button label={payLabel} fullWidth={false} onPress={onPay} />
      </div>
      {remaining > 0 ? (
        <p className="mt-xs text-body-sm text-white/60">
          Còn {remaining} khoản nữa trong danh sách bên dưới.
        </p>
      ) : null}
    </NightPanel>
  );
}

type PermitProps = {
  slotCode: string | null;
  validUntil: string | null;
  qrValue: string | null;
  onOpen: () => void;
};

export function PermitHero({ slotCode, validUntil, qrValue, onOpen }: PermitProps) {
  return (
    <NightPanel labelledBy="home-hero-permit">
      <div className="flex items-center gap-lg">
        <div className="min-w-0 flex-1">
          <h2
            id="home-hero-permit"
            className="flex items-center gap-xs text-display-md md:text-display-lg"
          >
            <Icon name="shield-check-outline" size={28} color={colors.tertiary} />
            <span>Giấy phép còn hiệu lực</span>
          </h2>
          <p className="mt-sm flex flex-wrap items-center gap-xs text-body-lg text-white/70">
            {slotCode ? <KerbTag code={slotCode} /> : null}
            {validUntil ? <span>đến {validUntil}</span> : null}
          </p>
          <div className="mt-lg [&>button]:w-full sm:[&>button]:w-auto sm:[&>button]:min-w-[200px]">
            <Button label="Xuất trình giấy phép" fullWidth={false} onPress={onOpen} />
          </div>
        </div>
        {qrValue ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label="Mở giấy phép QR"
            className="hidden shrink-0 rounded-md transition-transform hover:-translate-y-0.5 sm:block"
          >
            <QrCode value={qrValue} size={104} />
          </button>
        ) : null}
      </div>
    </NightPanel>
  );
}
