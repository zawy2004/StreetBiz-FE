import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Icon, QrCode, type IconName } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { sideApi } from '@/core/api/side-api';
import { statusLabel } from '@/core/constants/status-labels';
import { ContractTerm } from '@/features/sidewalk-slots/components/ContractTerm';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth-store';

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'white-balance-sunny', text: 'Tăng độ sáng màn hình.' },
  { icon: 'qrcode-scan', text: 'Giữ máy thẳng, cách camera của cán bộ một gang tay.' },
  {
    icon: 'tag-outline',
    text: 'Không quét được thì đọc mã in dưới QR để cán bộ nhập ở màn tuần tra.',
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

  if (!validId)
    return (
      <Screen>
        <ErrorState message="Mã hợp đồng không hợp lệ." />
      </Screen>
    );
  if (permit.isPending || contract.isPending) return <PermitSkeleton />;
  if (permit.error)
    return (
      <Screen>
        <AppHeader title="Giấy phép số" back subtitle="Xuất trình khi cán bộ kiểm tra" />
        <ErrorState message={permit.error.message} onRetry={() => void permit.refetch()} />
      </Screen>
    );

  // effectiveStatus (vw_PermitValidity), not permit_status: a slot already returned still reads permit_status ACTIVE.
  const valid = permit.data.effectiveStatus === 'VALID';
  const { label, tone } = statusLabel(permit.data.effectiveStatus);
  const verdict = VERDICT_TONES[tone];
  const contractState = statusLabel(permit.data.contractStatus).label;

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
                Số {permit.data.permitId}
              </span>
            </div>

            {contract.data && (
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-sm">
                <p className="inline-flex h-[52px] w-fit items-center rounded-[10px] bg-card px-sm font-sign text-[38px] font-extrabold leading-none tracking-[0.03em] text-[#111C2B] ring-[2.5px] ring-[#111C2B] [font-stretch:66%] dark:text-text dark:ring-text md:h-[58px] md:text-[44px]">
                  {contract.data.slotCode}
                </p>
                <p className="min-w-0 text-[16px] font-medium leading-snug text-text/80">
                  {contract.data.zoneName}
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
                  key={permit.dataUpdatedAt}
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
                  <QrCode value={permit.data.qrPayload} size={wide ? 280 : 248} />
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
                  {permit.data.qrPayload}
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
              startDate={permit.data.startDate}
              endDate={permit.data.endDate}
              today={new Date()}
              live={valid}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-sm gap-y-1 text-body-sm text-muted">
              <span className="flex items-center gap-1.5">
                {permit.isFetching ? (
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
                    Lấy từ máy chủ lúc {timeFormat.format(permit.dataUpdatedAt)}
                  </>
                )}
              </span>
              <span className="font-tabular">Hợp đồng #{permit.data.contractId}</span>
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
          payload={permit.data.qrPayload}
          slotCode={contract.data?.slotCode}
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
          <QrCode value={payload} size={size} />
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
