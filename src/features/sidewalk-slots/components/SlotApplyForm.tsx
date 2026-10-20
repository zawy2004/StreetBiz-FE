import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon, Money } from '@/components/common';
import { showToast } from '@/components/feedback';
import { sideApi, SideApiError, type FeeQuoteLine, type SidewalkSlot } from '@/core/api/side-api';
import { AgreementCheckbox } from '@/features/legal/components/AgreementCheckbox';
import { LEGAL_ROUTES } from '@/features/legal/legal-content';
import { useAuthStore } from '@/store/auth-store';
import { formatCountdown, formatShortVnd, secondsUntil } from '../slot-format';
import { slotDisplayState } from '../slot-stats';
import { SLOT_TONES } from '../slot-visuals';
import { useHolds } from '../useHolds';
import { useDebouncedValue, useNow } from '../useNow';
import { HOLD_WARNING_SECONDS } from '../plan-labels';
import { HoldRing } from './HoldRing';
import { RentalEligibilityMissing, RentalEligibilityOk } from './RentalEligibility';

const DEFAULT_TERM_DAYS = '90';
const MAX_TERM_DAYS = 365;

// The commitments themselves live on the slot-rules page (SLOT_COMMITMENTS); the
// backend only stores *that* the vendor agreed, and when.
const AGREEMENT_LINKS = [
  { label: 'Quy định thuê ô', to: LEGAL_ROUTES.slotRules },
  { label: 'Điều khoản sử dụng', to: LEGAL_ROUTES.terms },
];

type Props = { slot: SidewalkSlot };

/** A STANDARD zone rents by whole months: 1 / 3 / 6 / 12 of them, 30 days each. */
const TERM_MONTHS = [1, 3, 6, 12] as const;
const MONTH_DAYS = 30;

function quoteLineLabel(line: FeeQuoteLine, termDays: number): string {
  switch (line.kind) {
    case 'RENT':
      return line.calcBasis === 'PER_MONTH'
        ? `Tiền thuê ô (${formatShortVnd(line.unitAmount)}/tháng × ${line.quantity} tháng)`
        : `Tiền thuê ô (${formatShortVnd(line.unitAmount)}/ngày × ${line.quantity} ngày)`;
    case 'DISCOUNT':
      return line.label ?? 'Khuyến mãi';
    case 'DEPOSIT':
      return `${line.label} (hoàn lại khi kết thúc)`;
    default:
      if (line.calcBasis !== 'PER_DAY') return `${line.label} (một lần)`;
      // A per-day fee on a whole-month term reads better as a monthly figure.
      return termDays % MONTH_DAYS === 0
        ? `${line.label} (${formatShortVnd(line.unitAmount * MONTH_DAYS)}/tháng × ${termDays / MONTH_DAYS} tháng)`
        : `${line.label} (${formatShortVnd(line.unitAmount)}/ngày × ${line.quantity} ngày)`;
  }
}

/**
 * Everything a vendor does about one slot: pick the term, see the estimated
 * cost, hold it for a while, accept the commitments and apply. Shared by the
 * workspace's detail panel and the standalone /vendor/slots/:slotId screen.
 * On a phone the action row pins to the bottom while the form is on screen.
 */
export function SlotApplyForm({ slot }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const nowMs = useNow();
  const { registration, holds, hold, release, refresh } = useHolds();

  const [termDays, setTermDays] = useState(DEFAULT_TERM_DAYS);
  const [accepted, setAccepted] = useState(false);

  // Phase C: an EVENT zone's term may never outrun its own event window, regardless of the
  // general 365-day cap (mirrors WardComplianceService.EventZoneBlocker on the backend).
  const eventDaysLeft =
    slot.rentalMode === 'EVENT' && slot.eventEndDate
      ? Math.max(1, Math.ceil((Date.parse(slot.eventEndDate) - Date.now()) / 86_400_000) + 1)
      : null;
  const maxTermDays = eventDaysLeft ?? MAX_TERM_DAYS;

  const days = Number(termDays);
  const validDays = Number.isInteger(days) && days >= 1 && days <= maxTermDays;
  // A fixed location (STANDARD) is rented by the month only; an EVENT zone keeps the
  // free-text day count (its rental stays day by day).
  const isMonthly = slot.rentalMode === 'STANDARD';
  const discount = isMonthly ? slot.quarterDiscountPercent : null;
  // Typed days are debounced; a month button is a single deliberate click, so its price
  // follows at once.
  const typedDays = useDebouncedValue(days);
  const debouncedDays = isMonthly ? days : typedDays;

  const state = slotDisplayState(slot, nowMs);
  const myHold = holds.find((h) => h.slotId === slot.slotId);
  const heldByOther = state === 'HELD' && !myHold;

  // A hold lapses on its own; when the countdown reaches zero, re-read the
  // list so the basket and the slot's state stop showing it.
  useEffect(() => {
    if (myHold && Date.parse(myHold.expiresAt) <= nowMs) refresh();
  }, [myHold, nowMs, refresh]);

  const quote = useQuery({
    queryKey: ['side', userId, 'quote', slot.slotId, debouncedDays],
    queryFn: () => sideApi.getSlotQuote(slot.slotId, debouncedDays),
    enabled: validDays && debouncedDays === days,
    placeholderData: (previous) => previous,
  });

  const apply = useMutation({
    mutationFn: () =>
      sideApi.submitOpenSlotApplication({
        registrationId: registration!.registrationId,
        slotId: slot.slotId,
        requestedTermDays: days,
        commitmentsAccepted: accepted,
      }),
    onSuccess: (result) => {
      showToast(result.message);
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'applications'] });
      navigate('/vendor/slots/rental-applications');
    },
    onError: (error) => {
      showToast(error instanceof SideApiError ? error.message : 'Không gửi được đơn thuê.');
      refresh();
    },
  });

  if (state !== 'AVAILABLE' && state !== 'HELD') {
    const tone = SLOT_TONES[state];
    return (
      <p
        className={`flex items-center gap-sm rounded-[16px] p-md text-body-md font-semibold ${tone.wash} ${tone.ink}`}
      >
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          <Icon name={tone.icon} size={22} color="currentColor" weight="duotone" />
        </span>
        {state === 'ACTIVE'
          ? 'Ô này đã có người thuê.'
          : state === 'PENDING'
            ? 'Ô này đang có đơn chờ duyệt.'
            : 'Ô này đang tạm ngưng.'}
      </p>
    );
  }

  if (!registration) return <RentalEligibilityMissing />;

  const canSubmit = validDays && accepted && !heldByOther;
  const myHoldSeconds = myHold ? secondsUntil(myHold.expiresAt, nowMs) : 0;
  const holdEnding = myHold != null && myHoldSeconds <= HOLD_WARNING_SECONDS;

  return (
    <div className="flex flex-col gap-md">
      <RentalEligibilityOk
        registrationId={registration.registrationId}
        displayName={registration.displayName}
      />

      {isMonthly ? (
        <div className="flex flex-col gap-xs">
          <span className="text-label text-text">Thời hạn thuê</span>
          <div className="grid grid-cols-4 gap-xs">
            {TERM_MONTHS.map((months) => {
              const on = days === months * MONTH_DAYS;
              const discounted = discount != null && months % 3 === 0;
              return (
                <button
                  key={months}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTermDays(String(months * MONTH_DAYS))}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-[12px] px-xs py-1 text-label transition-[background-color,box-shadow,color] duration-150 active:scale-[0.98] ${
                    on
                      ? 'bg-tint-primary font-bold text-primary ring-2 ring-inset ring-primary'
                      : 'bg-card text-text ring-1 ring-inset ring-border hover:ring-text/25'
                  }`}
                >
                  {months} tháng
                  {discounted && (
                    <span className="text-body-xs font-semibold text-[#0B5D33] dark:text-[#8BE3B0]">
                      -{discount}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <label className="flex flex-col gap-xs text-label text-text">
          Số ngày thuê
          <input
            className={`h-12 w-full rounded-[12px] border bg-card px-sm font-tabular text-body-lg text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 ${
              validDays ? 'border-border' : 'border-error'
            }`}
            value={termDays}
            onChange={(e) => setTermDays(e.target.value)}
            inputMode="numeric"
            aria-invalid={!validDays}
          />
        </label>
      )}
      {slot.rentalMode === 'EVENT' && slot.eventEndDate && (
        <p className="flex items-start gap-1.5 rounded-[12px] bg-tint-secondary px-sm py-xs text-body-sm text-on-secondary">
          <Icon name="flag-outline" size={16} color="currentColor" className="mt-0.5 shrink-0" />
          <span>
            Khu vực sự kiện: chỉ thuê được đến hết ngày{' '}
            {new Date(slot.eventEndDate).toLocaleDateString('vi-VN')}.
          </span>
        </p>
      )}

      {/* Holds four lines of height while the quote is worked out, so nothing below jumps. */}
      <div className="min-h-[148px] overflow-hidden rounded-[16px] bg-bg ring-1 ring-inset ring-border">
        {!validDays ? (
          <p className="flex items-center gap-xs p-md text-body-sm font-semibold text-error">
            <Icon name="alert-circle-outline" size={18} color="currentColor" />
            {isMonthly ? 'Chọn thời hạn thuê.' : `Nhập 1 – ${maxTermDays} ngày.`}
          </p>
        ) : quote.error ? (
          <p className="p-md text-body-sm text-error">
            {quote.error instanceof SideApiError ? quote.error.message : 'Không tính được báo giá.'}
          </p>
        ) : quote.data ? (
          <ul className="divide-y divide-border">
            {quote.data.lines.map((line, i) => (
              <li
                key={`${line.kind}-${i}`}
                className="flex items-baseline justify-between gap-sm px-md py-xs"
              >
                <span
                  className={`min-w-0 text-body-sm ${
                    line.kind === 'DISCOUNT'
                      ? 'font-semibold text-[#0B5D33] dark:text-[#8BE3B0]'
                      : 'text-text'
                  }`}
                >
                  {quoteLineLabel(line, quote.data.termDays)}
                  {line.kind === 'FEE' && quote.data.isReferenceOnly ? ' (tham khảo)' : ''}
                </span>
                <Money
                  amountVnd={line.amount}
                  className={`shrink-0 whitespace-nowrap ${
                    line.kind === 'DISCOUNT' ? 'text-[#0B5D33] dark:text-[#8BE3B0]' : ''
                  }`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-xs p-md text-body-sm text-muted">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            Đang tính báo giá…
          </p>
        )}
      </div>

      {quote.data && validDays && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-sm">
            <p className="text-headline-sm text-text">Tạm tính</p>
            <span key={quote.data.total} className="sb-pop">
              <Money
                amountVnd={quote.data.total}
                size="lg"
                className="whitespace-nowrap font-sign font-bold"
              />
            </span>
          </div>
          <p className="flex items-center gap-1 text-body-sm text-muted">
            <Icon name="information-outline" size={15} color="currentColor" />
            Ước tính, chốt khi Phường duyệt ·
            <Link
              to={`${LEGAL_ROUTES.slotRules}#bao-gia`}
              target="_blank"
              rel="noopener"
              className="font-semibold text-primary hover:underline"
            >
              Cách tính
            </Link>
          </p>
        </div>
      )}

      <AgreementCheckbox checked={accepted} onChange={setAccepted} links={AGREEMENT_LINKS} />

      {heldByOther && slot.holdExpiresAt && (
        <div className="flex items-center gap-sm rounded-[16px] bg-[#FFF3D1] p-sm text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          <HoldRing nowMs={nowMs} size={40} other />
          <p className="text-body-sm font-semibold">
            Ô đang được hộ khác giữ chỗ (còn{' '}
            {formatCountdown(secondsUntil(slot.holdExpiresAt, nowMs))}).
          </p>
        </div>
      )}

      {/* One action row; on a phone it pins to the bottom (above the tab bar) while the form is in view. */}
      <div className="sticky bottom-0 z-10 -mx-md border-t border-border bg-card/95 px-md py-sm backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-sm">
          <div className="flex flex-col items-center gap-0.5">
            <HoldRing heldAt={myHold?.heldAt} expiresAt={myHold?.expiresAt} nowMs={nowMs} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <Button
              label="Đăng ký & nộp hồ sơ"
              icon={<Icon name="check-circle-outline" size={20} color="currentColor" />}
              loading={apply.isPending}
              disabled={!canSubmit}
              onPress={() => apply.mutate()}
            />
            {myHold ? (
              <Button
                variant="outline"
                label={`Nhả chỗ · ${formatCountdown(myHoldSeconds)}`}
                icon={<Icon name="bookmark" size={18} color="currentColor" />}
                loading={release.isPending}
                onPress={() => release.mutate(slot.slotId)}
              />
            ) : (
              <Button
                variant="outline"
                label="Giữ chỗ 15 phút"
                icon={<Icon name="bookmark-outline" size={18} color="currentColor" />}
                loading={hold.isPending}
                disabled={heldByOther}
                onPress={() => hold.mutate(slot.slotId)}
              />
            )}
          </div>
        </div>
        {holdEnding ? (
          <p className="mt-xs flex items-center gap-1 text-body-sm font-semibold text-primary">
            <Icon name="timer-outline" size={16} color="currentColor" />
            Sắp hết giữ chỗ
          </p>
        ) : null}
      </div>
    </div>
  );
}
