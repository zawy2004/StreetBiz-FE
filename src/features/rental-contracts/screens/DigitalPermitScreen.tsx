import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Icon, QrCode, type IconName } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { sideApi } from '@/core/api/side-api';
import { statusLabel } from '@/core/constants/status-labels';
import { ContractTerm } from '@/features/sidewalk-slots/components/ContractTerm';
import { isNoSignal } from '@/core/pwa/no-signal';
import {
  loadOfflinePermit,
  offlineStatus,
  saveOfflinePermit,
  type OfflinePermit,
} from '@/core/pwa/permit-offline-store';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth-store';

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

const savedParts = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** "07:42 18/11", built by hand: the separators of a locale's own format differ between engines. */
function formatSavedAt(ms: number): string {
  const part = (type: string) =>
    savedParts.formatToParts(ms).find((p) => p.type === type)?.value ?? '';
  return `${part('hour')}:${part('minute')} ${part('day')}/${part('month')}`;
}

/** The saved copy in the shape the screen reads, its status brought up to date by the calendar. */
function savedAsPermit(copy: OfflinePermit) {
  return {
    permitId: copy.permitId,
    contractId: copy.contractId,
    qrPayload: copy.qrPayload,
    qrUrl: copy.qrUrl,
    startDate: copy.startDate,
    endDate: copy.endDate,
    permitStatus: copy.effectiveStatus,
    contractStatus: copy.contractStatus,
    effectiveStatus: offlineStatus(copy),
  };
}

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'white-balance-sunny', text: 'Tăng độ sáng màn hình.' },
  { icon: 'qrcode-scan', text: 'Giữ máy thẳng, cách camera của cán bộ một gang tay.' },
  {
    icon: 'tag-outline',
    text: 'Không quét được thì đọc mã in dưới QR để cán bộ nhập vào máy kiểm tra.',
  },
];

/**
 * The digital permit as the pass it stands for: the painted kerb along its top,
 * the slot plate, the verdict in large words on a pale wash of its colour (the
 * ward stamp pressed beside it only while it is valid), the QR exactly as the
 * server sent it, and a tear-off stub with the term. An invalid permit keeps
 * its QR dimmed with a band across it, and gets no stamp.
 */
export function DigitalPermitScreen() {
  const { id } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);
  const wide = useMediaQuery('(min-width: 768px)');
  const [fullscreen, setFullscreen] = useState(false);

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const permit = useQuery({
    queryKey: ['side', userId, 'permit', contractId],
    queryFn: () => sideApi.getPermit(contractId),
    enabled: validId,
  });

  // The copy kept on this phone after the last successful read (see permit-offline-store).
  const saved = useMemo(
    () => (validId ? loadOfflinePermit(userId, contractId) : null),
    // Re-read after each fresh read, which has just rewritten it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, contractId, validId, permit.dataUpdatedAt],
  );

  // Every successful read refreshes the saved copy, so it is never older than the last time the
  // permit was seen with a connection.
  useEffect(() => {
    if (!validId || !permit.data || userId === undefined) return;
    saveOfflinePermit(userId, {
      permitId: permit.data.permitId,
      contractId,
      qrPayload: permit.data.qrPayload,
      qrUrl: permit.data.qrUrl ?? null,
      slotCode: contract.data?.slotCode ?? saved?.slotCode ?? null,
      zoneName: contract.data?.zoneName ?? saved?.zoneName ?? null,
      startDate: permit.data.startDate,
      endDate: permit.data.endDate,
      effectiveStatus: permit.data.effectiveStatus,
      contractStatus: permit.data.contractStatus,
      savedAt: permit.dataUpdatedAt || Date.now(),
    });
    // `saved` is only a fallback for the slot name; it must not retrigger the write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validId, userId, contractId, permit.data, permit.dataUpdatedAt, contract.data]);

  // No signal: the queries pause (or fail with a network error) and nothing new arrives. Fall back
  // to the saved copy, if there is one.
  const noSignal = isNoSignal(permit);
  const fromSaved = !permit.data && saved !== null && noSignal;

  if (!validId)
    return (
      <Screen>
        <ErrorState message="Mã hợp đồng không hợp lệ." />
      </Screen>
    );
  if (!permit.data && !fromSaved) {
    if (noSignal)
      return (
        <Screen>
          <AppHeader title="Giấy phép số" back subtitle="Xuất trình khi cán bộ kiểm tra" />
          <ErrorState
            message="Đang mất mạng và máy chưa lưu giấy phép này. Hãy mở giấy phép một lần khi có mạng để dùng được lúc mất sóng."
            onRetry={() => void permit.refetch()}
          />
        </Screen>
      );
    if (permit.isPending) return <PermitSkeleton />;
    if (permit.error)
      return (
        <Screen>
          <AppHeader title="Giấy phép số" back subtitle="Xuất trình khi cán bộ kiểm tra" />
          <ErrorState message={permit.error.message} onRetry={() => void permit.refetch()} />
        </Screen>
      );
  }
  if (!fromSaved && contract.isPending && contract.fetchStatus !== 'paused')
    return <PermitSkeleton />;

  // What is on screen: the server's answer, or the saved copy with its status brought up to date by
  // the calendar (a "valid" permit whose end date has passed reads expired even with no signal).
  const shown = permit.data ?? savedAsPermit(saved as OfflinePermit);
  const plate =
    contract.data ?? (saved ? { slotCode: saved.slotCode, zoneName: saved.zoneName } : null);
  const readAt = fromSaved ? (saved as OfflinePermit).savedAt : permit.dataUpdatedAt;

  // effectiveStatus (vw_PermitValidity), not permit_status: a slot already returned still reads permit_status ACTIVE.
  const valid = shown.effectiveStatus === 'VALID';
  const { label, tone } = statusLabel(shown.effectiveStatus);
  const verdict = VERDICT_TONES[tone];
  const contractState = statusLabel(shown.contractStatus).label;
  // A link (`/q/<token>`) when the server has a public base URL, so any phone camera opens the
  // check page; otherwise the bare signed token, as before. Either way the token itself is
  // printed below for typing in by hand.
  const qrValue = shown.qrUrl || shown.qrPayload;

  const zoomButton = (
    <Button
      label="Phóng to mã"
      icon={<Icon name="qrcode" size={20} color="currentColor" />}
      onPress={() => setFullscreen(true)}
    />
  );

  return (
    <Screen footer={wide ? undefined : <StickyActions>{zoomButton}</StickyActions>}>
      <AppHeader title="Giấy phép số" back subtitle="Xuất trình khi cán bộ kiểm tra" />

      {fromSaved ? (
        <p
          role="status"
          className="mb-md rounded-[14px] bg-tint-secondary px-md py-sm text-body-md font-semibold text-on-secondary"
        >
          Đang mất mạng: đây là bản đã lưu lúc {formatSavedAt(readAt)}. Mã QR vẫn hiện để cán bộ
          quét, nhưng máy của cán bộ cần có mạng để kiểm tra, và trạng thái ở đây có thể đã cũ.
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-lg xl:flex-row xl:items-start xl:justify-center xl:gap-[40px]">
        <article
          aria-label="Giấy phép vỉa hè"
          className="sb-pop w-full max-w-[440px] overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
        >
          <div aria-hidden="true" className="sb-kerb" />
          <div className="flex flex-col gap-md px-[20px] pb-md pt-md md:px-lg">
            <div className="flex items-center justify-between gap-sm text-[13px]">
              <span className="text-muted">Giấy phép vỉa hè</span>
              <span className="font-sign font-tabular font-semibold text-text">
                Số {shown.permitId}
              </span>
            </div>

            {plate && (
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-sm">
                <p className="inline-flex h-[52px] w-fit items-center rounded-[10px] bg-card px-sm font-sign text-[38px] font-extrabold leading-none tracking-[0.03em] text-[#111C2B] ring-[2.5px] ring-[#111C2B] [font-stretch:66%] dark:text-text dark:ring-text md:h-[58px] md:text-[44px]">
                  {plate.slotCode}
                </p>
                <p className="min-w-0 text-[16px] font-medium leading-snug text-text/80">
                  {plate.zoneName}
                </p>
              </div>
            )}

            {/* The verdict: the one place its words appear. */}
            <div className={`relative overflow-visible rounded-[18px] px-md py-sm ${verdict.wash}`}>
              <p className={`flex items-center gap-sm ${valid ? 'pr-[96px]' : ''} ${verdict.ink}`}>
                <Icon name={verdict.icon} size={36} color="currentColor" weight="fill" />
                <span className="font-sign text-[34px] font-extrabold leading-none tracking-[-0.01em] [font-stretch:88%] md:text-[40px]">
                  {label.toUpperCase()}
                </span>
              </p>
              {valid ? (
                <PermitStamp
                  key={readAt}
                  icon="check-circle"
                  inkClass={verdict.ink}
                  strokeClass={verdict.stroke}
                  className="absolute -right-1 -top-7 h-[104px] w-[104px] md:-top-9 md:h-[120px] md:w-[120px]"
                />
              ) : null}
            </div>
            {!valid ? (
              <p className="-mt-xs text-body-sm text-muted">Hợp đồng: {contractState}</p>
            ) : null}

            <div className="flex flex-col items-center gap-sm">
              <div className="relative">
                <div className={valid ? '' : 'opacity-40'}>
                  <QrCode value={qrValue} size={wide ? 280 : 248} label="Mã QR giấy phép số" />
                </div>
                {valid ? null : <InvalidBand />}
              </div>
              <p className="text-center text-[16px] font-semibold text-text">
                {valid
                  ? 'Quét mã QR để kiểm tra giấy phép.'
                  : 'Giấy phép này hiện không có hiệu lực.'}
              </p>
              <p className="flex w-full items-baseline justify-center gap-xs">
                <span className="shrink-0 text-body-xs text-muted">Mã</span>
                <span className="select-all break-all font-sign font-tabular text-[14px] font-semibold text-text">
                  {shown.qrPayload}
                </span>
              </p>
            </div>
          </div>

          {/* Tear-off line with two half-moon notches */}
          <div aria-hidden="true" className="relative h-0">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-bg ring-1 ring-border" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-bg ring-1 ring-border" />
            <span className="absolute inset-x-md top-0 border-t-2 border-dashed border-border" />
          </div>

          <div className="flex flex-col gap-sm px-[20px] pb-lg pt-lg md:px-lg">
            <p className="text-headline-sm text-text">Hiệu lực</p>
            <ContractTerm
              startDate={shown.startDate}
              endDate={shown.endDate}
              today={new Date()}
              live={valid && !fromSaved}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-sm gap-y-1 text-body-sm text-muted">
              <span className="flex items-center gap-1.5">
                {fromSaved ? (
                  <>
                    <Icon name="cloud-off-outline" size={16} color="currentColor" />
                    Bản lưu lúc {formatSavedAt(readAt)}, đang mất mạng
                  </>
                ) : permit.isFetching ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 animate-pulse rounded-full bg-brand"
                    />
                    Đang kiểm tra lại với máy chủ…
                  </>
                ) : (
                  <>
                    <Icon name="cloud-check-outline" size={16} color="currentColor" />
                    Lấy từ máy chủ lúc {timeFormat.format(readAt)}
                  </>
                )}
              </span>
              <span className="font-tabular">Hợp đồng #{shown.contractId}</span>
            </div>
          </div>
        </article>

        <div className="flex w-full max-w-[440px] flex-col gap-md xl:w-[340px]">
          {wide ? zoomButton : null}
          <section className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
            <h2 className="mb-sm font-sign text-[17px] font-bold text-text">Khi cán bộ kiểm tra</h2>
            <ul className="flex flex-col gap-sm">
              {TIPS.map((tip) => (
                <li key={tip.text} className="flex items-start gap-sm text-body-md text-text">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-primary text-primary"
                  >
                    <Icon name={tip.icon} size={17} color="currentColor" />
                  </span>
                  <span className="pt-1">{tip.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {fullscreen ? (
        <PermitFullscreen
          payload={qrValue}
          slotCode={plate?.slotCode ?? undefined}
          label={label.toUpperCase()}
          inkClass={verdict.ink}
          icon={verdict.icon}
          valid={valid}
          onClose={() => setFullscreen(false)}
        />
      ) : null}
    </Screen>
  );
}

/** A diagonal band across an invalid permit's QR. Decoration: the sentence below says it in words. */
function InvalidBand() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-md"
    >
      <span className="w-[140%] -rotate-[24deg] bg-[#FDEBEA] py-1.5 text-center font-sign text-[17px] font-extrabold tracking-[0.12em] text-[#8F1717] shadow-card ring-1 ring-[#8F1717]/30">
        KHÔNG CÓ HIỆU LỰC
      </span>
    </div>
  );
}

/**
 * The same QR (same payload, nothing fetched) as large as the screen allows, on
 * white, for scanning from a step away. An invalid permit keeps its band here too.
 */
function PermitFullscreen({
  payload,
  slotCode,
  label,
  inkClass,
  icon,
  valid,
  onClose,
}: {
  payload: string;
  slotCode: string | undefined;
  label: string;
  inkClass: string;
  icon: IconName;
  valid: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const size = Math.max(200, Math.min(window.innerWidth, window.innerHeight - 220) - 64);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mã QR giấy phép phóng to"
      className="fixed inset-0 z-[1100] flex flex-col items-center justify-between gap-md bg-white px-md py-lg text-[#111C2B]"
    >
      <div className="flex flex-col items-center gap-xs">
        {slotCode ? (
          <span className="inline-flex h-12 items-center rounded-[10px] px-sm font-sign text-[34px] font-extrabold leading-none ring-[2.5px] ring-[#111C2B] [font-stretch:66%]">
            {slotCode}
          </span>
        ) : null}
        <span
          className={`flex items-center gap-xs font-sign text-[28px] font-extrabold ${inkClass}`}
        >
          <Icon name={icon} size={28} color="currentColor" weight="fill" />
          {label}
        </span>
      </div>
      <div className="relative">
        <div className={valid ? '' : 'opacity-40'}>
          <QrCode value={payload} size={size} label="Mã QR giấy phép số" />
        </div>
        {valid ? null : <InvalidBand />}
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="h-14 w-full max-w-[440px] rounded-[14px] bg-[#111C2B] text-[17px] font-semibold text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Đóng
      </button>
    </div>
  );
}

function PermitSkeleton() {
  return (
    <Screen>
      <div
        role="status"
        aria-label="Đang tải giấy phép"
        className="flex flex-col items-center gap-lg"
      >
        <Skeleton className="h-9 w-48 self-start" />
        <div className="w-full max-w-[440px] overflow-hidden rounded-[28px] bg-card ring-1 ring-border">
          <div aria-hidden="true" className="sb-kerb" />
          <div className="flex flex-col items-center gap-md p-lg">
            <Skeleton className="h-12 w-40 self-start" />
            <Skeleton className="h-14 w-full rounded-[18px]" />
            <Skeleton className="h-[248px] w-[248px]" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
