import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { sideApi, type RentalApplication, type RentalContract } from '@/core/api/side-api';
import { statusLabel } from '@/core/constants/status-labels';
import { useAuthStore } from '@/store/auth-store';
import {
  ApplicationSlipArt,
  ContractStampArt,
  ProposalPinArt,
  TransferSwapArt,
} from '../components/HubArt';
import { summarizeMySlots } from '../my-slots-summary';
import { contractProgress, countApplications } from '../my-slots-view';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * Everything a vendor does *after* picking a slot -- applications, contracts,
 * transfers, proposing a new slot -- in one place, so the workspace screen can
 * stay about choosing a slot. Query keys match the list screens, so opening a
 * section reuses what is already loaded. Drawn as a crossroads: the rental
 * journey with its counts on top, four big signposts below; one with something
 * waiting on the vendor carries a mango flag.
 */
export function MySlotsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const applications = useQuery({
    queryKey: ['side', userId, 'applications'],
    queryFn: () => sideApi.listApplications(),
  });
  const contracts = useQuery({
    queryKey: ['side', userId, 'contracts'],
    queryFn: () => sideApi.listContracts(),
  });
  const incoming = useQuery({
    queryKey: ['side', userId, 'transfers', 'incoming'],
    queryFn: () => sideApi.listTransfers('incoming'),
  });

  const summary = summarizeMySlots({
    applications: applications.data,
    contracts: contracts.data,
    incomingTransfers: incoming.data,
  });

  // The API lists oldest first, so the latest application is the last one.
  const latest = applications.data?.[applications.data.length - 1];
  const expiringSoon = countExpiringSoon(contracts.data);

  return (
    <Screen>
      <AppHeader title="Thuê ô của tôi" back />

      <RentalJourney
        applications={applications.data}
        applicationsFailed={!!applications.error}
        contracts={contracts.data}
        contractsFailed={!!contracts.error}
        onStart={() => navigate('/vendor/slots')}
      />

      <div className="grid gap-sm md:grid-cols-2 md:gap-md">
        <HubSignTile
          art={<ApplicationSlipArt />}
          title="Đơn thuê ô"
          subtitle={summary.applications.text}
          attention={summary.applications.attention}
          extra={
            latest ? (
              <span className="block truncate text-body-sm text-muted">
                Đơn gần nhất #{latest.applicationId}: {statusLabel(latest.applicationStatus).label}
                {latest.createdAt && !Number.isNaN(Date.parse(latest.createdAt))
                  ? `, nộp ${formatDate(latest.createdAt)}`
                  : ''}
              </span>
            ) : null
          }
          onPress={() => navigate('/vendor/slots/rental-applications')}
        />
        <HubSignTile
          art={<ContractStampArt />}
          title="Hợp đồng thuê ô"
          subtitle={summary.contracts.text}
          attention={summary.contracts.attention}
          extra={
            expiringSoon > 0 ? (
              <span className="inline-flex h-7 w-fit items-center gap-1 rounded-full bg-[#FFF3D1] px-sm text-body-sm font-semibold text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                <Icon name="timer-outline" size={14} color="currentColor" />
                {expiringSoon} hợp đồng sắp hết hạn
              </span>
            ) : null
          }
          onPress={() => navigate('/vendor/slots/contracts')}
        />
        <HubSignTile
          art={<TransferSwapArt />}
          title="Chuyển nhượng ô"
          subtitle={summary.transfers.text}
          attention={summary.transfers.attention}
          onPress={() => navigate('/vendor/slots/transfers')}
        />
        <HubSignTile
          art={<ProposalPinArt />}
          title="Đề xuất ô mới"
          subtitle="Gửi vị trí chưa có trong danh sách"
          onPress={() => navigate('/vendor/slots/slot-proposals/new')}
        />
      </div>
    </Screen>
  );
}

/** ACTIVE contracts within the "sắp hết hạn" window; contracts without both dates are left out. */
function countExpiringSoon(contracts: readonly RentalContract[] | undefined): number {
  if (!contracts) return 0;
  const today = new Date();
  return contracts.filter(
    (c) =>
      c.contractStatus === 'ACTIVE' &&
      !!c.startDate &&
      !!c.endDate &&
      contractProgress(c.startDate, c.endDate, today).expiringSoon,
  ).length;
}

/**
 * A big signpost: drawing, title in signage letters, the live summary, an arrow
 * like a direction sign, a thin kerb along its foot. With something waiting on
 * the vendor it carries a flag and an orange edge, and moves to the top on a
 * phone (CSS order only; the DOM and tab order stay put).
 */
function HubSignTile({
  art,
  title,
  subtitle,
  attention = false,
  extra,
  onPress,
}: {
  art: ReactNode;
  title: string;
  subtitle: string;
  attention?: boolean;
  extra?: ReactNode;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'group relative flex min-h-[168px] w-full flex-col overflow-hidden rounded-[22px] bg-card text-left shadow-card ring-1 ring-border',
        'transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
        attention ? 'order-first md:order-none' : '',
      ].join(' ')}
    >
      {attention ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand" />
      ) : null}
      <span className="flex flex-1 items-start gap-md p-md md:p-lg">
        <span className="h-14 w-14 shrink-0 md:h-16 md:w-16">{art}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {attention ? (
            <span className="mb-0.5 inline-flex h-6 w-fit items-center gap-1.5 rounded-full bg-[#FFF3D1] px-2 text-badge text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="sb-ping absolute inset-0 rounded-full bg-current opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-current" />
              </span>
              Cần bạn xử lý
            </span>
          ) : null}
          <span className="block font-sign text-[22px] font-bold leading-7 text-text">{title}</span>
          <span
            className={`line-clamp-2 text-[15px] leading-[22px] ${attention ? 'font-semibold text-primary' : 'text-muted'}`}
          >
            {subtitle}
          </span>
          {extra}
        </span>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-tint-primary text-primary transition-transform duration-200 group-hover:translate-x-1"
        >
          <Icon name="arrow-right" size={20} color="currentColor" weight="fill" />
        </span>
      </span>
      <span aria-hidden="true" className="sb-kerb block shrink-0" style={{ height: 4 }} />
    </button>
  );
}

/**
 * The four stops from a slot to a permit, each with its count from what is
 * already loaded. A list that failed shows "—", never a made-up zero.
 */
function RentalJourney({
  applications,
  applicationsFailed,
  contracts,
  contractsFailed,
  onStart,
}: {
  applications: readonly RentalApplication[] | undefined;
  applicationsFailed: boolean;
  contracts: readonly RentalContract[] | undefined;
  contractsFailed: boolean;
  onStart: () => void;
}) {
  const appCounts = applications ? countApplications(applications) : null;
  const active = contracts ? contracts.filter((c) => c.contractStatus === 'ACTIVE').length : null;
  const stops: { label: string; note: string; value: number | null; failed: boolean }[] = [
    {
      label: 'Nộp đơn',
      note: 'đơn đang mở',
      value: appCounts?.OPEN ?? null,
      failed: applicationsFailed,
    },
    {
      label: 'Phường duyệt',
      note: 'đơn đã duyệt',
      value: appCounts?.APPROVED ?? null,
      failed: applicationsFailed,
    },
    {
      label: 'Hợp đồng & giấy phép',
      note: 'đang hiệu lực',
      value: active,
      failed: contractsFailed,
    },
  ];
  // The road is painted up to the last stop that has something on it.
  const reached = stops.reduce((last, s, i) => ((s.value ?? 0) > 0 ? i + 1 : last), 0);

  return (
    <section className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
      <ol
        aria-label="Hành trình thuê ô"
        className="relative grid grid-cols-4 gap-xs px-sm pb-md pt-lg md:px-lg"
      >
        <span
          aria-hidden="true"
          className="absolute left-[12.5%] right-[12.5%] top-[calc(24px+22px)] h-1 rounded-full bg-border md:top-[calc(24px+26px)]"
        >
          <span
            className="block h-full rounded-full bg-brand transition-[width] duration-700 [transition-timing-function:var(--ease-out)]"
            style={{ width: `${(reached / 3) * 100}%` }}
          />
        </span>
        <li className="relative flex flex-col items-center gap-xs text-center">
          <button
            type="button"
            onClick={onStart}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-[0_8px_18px_-8px_rgb(var(--c-brand)/0.9)] ring-4 ring-card transition-transform active:scale-95 md:h-[52px] md:w-[52px]"
          >
            <Icon name="map-marker-outline" size={22} color="currentColor" weight="fill" />
            <span className="sr-only">Chọn ô, bắt đầu ở đây</span>
          </button>
          <span className="text-body-sm font-semibold text-text">Chọn ô</span>
          <span className="hidden text-body-xs text-primary sm:block">Bắt đầu ở đây</span>
        </li>
        {stops.map((stop) => {
          const lit = (stop.value ?? 0) > 0;
          return (
            <li key={stop.label} className="relative flex flex-col items-center gap-xs text-center">
              <span
                className={`flex h-11 min-w-11 items-center justify-center rounded-full px-1 font-sign text-[24px] font-extrabold leading-none ring-4 ring-card md:h-[52px] md:min-w-[52px] md:text-[30px] ${
                  lit
                    ? 'bg-card text-text shadow-card outline outline-[3px] -outline-offset-[3px] outline-brand'
                    : 'bg-sunken text-muted'
                }`}
              >
                {stop.failed ? (
                  '—'
                ) : stop.value == null ? (
                  <span aria-hidden="true" className="sb-shimmer block h-7 w-8 rounded-sm" />
                ) : (
                  stop.value
                )}
              </span>
              <span className="text-body-sm font-semibold leading-tight text-text">
                {stop.label}
              </span>
              <span className="hidden text-body-xs text-muted sm:block">{stop.note}</span>
            </li>
          );
        })}
      </ol>
      <p className="flex items-start gap-xs border-t border-border bg-[#FFF3E8] px-md py-sm text-body-sm text-text dark:bg-[#2A2420] md:px-lg">
        <Icon
          name="shield-check-outline"
          size={18}
          color="currentColor"
          className="mt-px shrink-0 text-primary"
        />
        Phường duyệt đơn là hợp đồng và giấy phép QR được tạo tự động.
      </p>
    </section>
  );
}
