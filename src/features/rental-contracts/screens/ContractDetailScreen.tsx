import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon, IconButton, Money, type IconName } from '@/components/common';
import { Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import {
  sideApi,
  SideApiError,
  type RenewalRequest,
  type RentalContract,
  type SidewalkSlot,
} from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { contractProgress } from '@/features/sidewalk-slots/my-slots-view';
import { formatAreaSqm, formatHours, formatSize } from '@/features/sidewalk-slots/slot-format';
import { BUSINESS_CATEGORY_LABELS } from '@/features/sidewalk-slots/slot-stats';
import { useAuthStore } from '@/store/auth-store';
import { TermRing } from '../components/TermRing';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * One rental contract as a pass: the slot plate as the page title, the term
 * ring with the days left, the facts in one strip, the renewal note when there
 * is one; then the four things a vendor can do with it (the destructive one
 * last, in red), the contract's timeline with its renewals, and the slot itself.
 */
export function ContractDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const slot = useQuery({
    queryKey: ['side', 'slot', contract.data?.slotId],
    queryFn: () => sideApi.getSlot(contract.data!.slotId),
    enabled: !!contract.data,
  });

  const renewals = useQuery({
    queryKey: ['side', userId, 'contract', contractId, 'renewals'],
    queryFn: () => sideApi.listRenewals(contractId),
    enabled: validId,
  });
  const openRenewal = renewals.data?.find(
    (r) => r.renewalStatus === 'PENDING' || r.renewalStatus === 'UNDER_REVIEW',
  );

  const withdrawRenewal = useMutation({
    mutationFn: () => sideApi.withdrawRenewal(contractId, openRenewal!.renewalId),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({
        queryKey: ['side', userId, 'contract', contractId, 'renewals'],
      });
    },
    onError: (err) =>
      showToast(err instanceof SideApiError ? err.message : 'Không rút được đơn gia hạn.'),
  });

  if (!validId)
    return (
      <Screen>
        <ErrorState message="Mã hợp đồng không hợp lệ." />
      </Screen>
    );
  if (contract.isPending) return <ContractSkeleton />;
  if (contract.error)
    return (
      <Screen>
        <ErrorState message={contract.error.message} onRetry={() => void contract.refetch()} />
      </Screen>
    );

  const data = contract.data;
  const isActive = data.contractStatus === 'ACTIVE';
  const live = isActive || data.contractStatus === 'SUSPENDED';
  const today = new Date();
  const progress = contractProgress(data.startDate, data.endDate, today);
  const expiringSoon = isActive && progress.expiringSoon;
  const size = slot.data
    ? [
        formatSize(slot.data.widthMeters, slot.data.lengthMeters),
        formatAreaSqm(slot.data.widthMeters, slot.data.lengthMeters),
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  const go = (path: string) => () => navigate(`/vendor/slots/contracts/${data.contractId}/${path}`);

  const actions = isActive ? (
    <section aria-labelledby="contract-actions" className="flex flex-col gap-sm">
      <h2 id="contract-actions" className="font-sign text-[18px] font-bold text-text">
        Thao tác
      </h2>
      <div className="grid gap-sm sm:grid-cols-2 xl:grid-cols-1">
        <LifecycleTile
          kind="permit"
          icon="qrcode"
          title="Giấy phép QR"
          subtitle="Xuất trình khi cán bộ kiểm tra"
          onPress={go('permit')}
        />
        <LifecycleTile
          icon="timer-outline"
          title="Gia hạn"
          subtitle="Gửi yêu cầu kéo dài thời hạn thuê"
          attention={expiringSoon}
          onPress={go('renewal')}
        />
        <LifecycleTile
          icon="swap-horizontal"
          title="Chuyển nhượng"
          subtitle="Chuyển ô cho hộ kinh doanh khác"
          onPress={go('transfer')}
        />
        <LifecycleTile
          kind="danger"
          icon="close-circle-outline"
          title="Trả ô"
          subtitle="Kết thúc hợp đồng trước hạn"
          onPress={go('return')}
        />
      </div>
    </section>
  ) : null;

  return (
    <Screen>
      <div className="flex items-center gap-sm">
        <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} />
        <p className="text-body-md font-semibold text-muted">Hợp đồng thuê ô</p>
      </div>

      {/* One column on phones (pass, actions within thumb reach, timeline, slot); two from 1280px. */}
      <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start xl:gap-x-xl">
        {/* The contract pass */}
        <article className="min-w-0 overflow-hidden rounded-[24px] bg-card shadow-sheet ring-1 ring-border xl:col-start-1 xl:row-start-1">
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex flex-col gap-lg p-md md:p-lg">
            <div className="flex flex-col gap-lg md:flex-row md:items-center">
              {live ? (
                <div className="flex justify-center md:order-first md:justify-start">
                  <TermRing
                    startDate={data.startDate}
                    endDate={data.endDate}
                    today={today}
                    size="lg"
                  />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-col gap-sm">
                <div className="flex flex-wrap items-center gap-sm">
                  <h1 className="inline-flex h-14 items-center rounded-[10px] bg-card px-sm font-sign text-[34px] font-extrabold leading-none tracking-[0.03em] text-text ring-[2.5px] ring-text [font-stretch:66%] md:text-[40px]">
                    {data.slotCode}
                  </h1>
                  <StatusChip code={data.contractStatus} />
                </div>
                <p className="flex items-center gap-1 text-body-lg text-text">
                  <Icon
                    name="map-marker-outline"
                    size={18}
                    color="currentColor"
                    className="text-muted"
                  />
                  {data.zoneName}
                </p>
                {live ? (
                  <p className="text-body-sm text-muted">Đã dùng {progress.percent}% thời hạn</p>
                ) : (
                  <p className="font-tabular text-body-md text-muted">
                    {formatDate(data.startDate)} – {formatDate(data.endDate)}
                  </p>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-xs md:grid-cols-4 xl:grid-cols-2">
              <Stat label="Đơn giá ngày">
                {slot.data ? (
                  <>
                    <Money amountVnd={slot.data.pricePerDay} className="font-sign font-bold" />
                    <span className="ml-1 text-body-sm text-muted">/ ngày</span>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Stat>
              {size ? <Stat label="Kích thước">{size}</Stat> : null}
              {slot.data ? (
                <Stat label="Giờ bán">
                  {formatHours(slot.data.availableFrom, slot.data.availableTo)}
                </Stat>
              ) : null}
              <Stat label="Mã hợp đồng">{`#${data.contractId}`}</Stat>
            </dl>

            {expiringSoon && !openRenewal && (
              <Callout tone="pending">
                Hợp đồng sắp hết hạn. Gia hạn để tiếp tục thuê ô này.
              </Callout>
            )}
            {openRenewal && (
              <Callout tone="pending">
                <div className="flex flex-col gap-xs">
                  <span>
                    Đơn xin gia hạn thêm {openRenewal.requestedTermDays} ngày đang{' '}
                    {openRenewal.renewalStatus === 'UNDER_REVIEW' ? 'được xét duyệt' : 'chờ xử lý'}.
                    Phường sẽ xử lý trong thời hạn quy định.
                  </span>
                  <Button
                    label="Rút đơn gia hạn"
                    variant="outline"
                    loading={withdrawRenewal.isPending}
                    onPress={() => withdrawRenewal.mutate()}
                  />
                </div>
              </Callout>
            )}
            {data.cancellationReason && (
              <Callout tone="neutral">
                <strong>Lý do huỷ:</strong> {data.cancellationReason}
              </Callout>
            )}
            {data.contractStatus === 'SUSPENDED' ? (
              <p className="rounded-[14px] bg-[#FDEBEA] px-sm py-xs text-body-sm font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
                Hợp đồng đang tạm ngưng. Các thao tác giấy phép, gia hạn, chuyển nhượng và trả ô tạm
                khoá.
              </p>
            ) : null}
            {!live ? (
              <div className="flex flex-wrap items-center justify-between gap-sm rounded-[14px] bg-bg px-sm py-xs ring-1 ring-inset ring-border">
                <span className="text-body-md text-text">Hợp đồng đã kết thúc.</span>
                <button
                  type="button"
                  onClick={() => navigate('/vendor/slots')}
                  className="inline-flex h-11 items-center gap-1 rounded-[10px] px-sm text-label font-semibold text-primary hover:bg-tint-primary"
                >
                  Tìm ô khác
                  <Icon name="chevron-right" size={16} color="currentColor" />
                </button>
              </div>
            ) : null}
          </div>
        </article>

        {actions ? <div className="min-w-0 xl:col-start-2 xl:row-start-1">{actions}</div> : null}
        <div className="flex min-w-0 flex-col gap-lg xl:col-start-1 xl:row-start-2">
          <ContractTimeline contract={data} openRenewal={openRenewal} today={today} />
          {renewals.data && renewals.data.length > 0 ? (
            <RenewalHistory renewals={renewals.data} />
          ) : null}
        </div>
        {slot.data ? (
          <div className="min-w-0 xl:col-start-2 xl:row-start-2">
            <SlotSnapshot slot={slot.data} />
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] bg-bg p-sm ring-1 ring-inset ring-border">
      <dt className="text-body-xs text-muted">{label}</dt>
      <dd className="font-tabular text-[16px] font-semibold leading-snug text-text">{children}</dd>
    </div>
  );
}

/**
 * One of the four lifecycle actions as a big tile (title + subtitle, like the
 * old action rows). The permit tile carries a small permit pass with the kerb;
 * the destructive one is red.
 */
function LifecycleTile({
  icon,
  title,
  subtitle,
  onPress,
  attention = false,
  kind = 'default',
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  attention?: boolean;
  kind?: 'default' | 'permit' | 'danger';
}) {
  const permit = kind === 'permit';
  const danger = kind === 'danger';
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'group relative flex min-h-[88px] w-full items-center gap-sm overflow-hidden rounded-[18px] p-md text-left shadow-card ring-1',
        'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
        permit
          ? 'bg-[#FFF3E8] ring-brand/25 dark:bg-[#2A2420] sm:col-span-2 sm:min-h-[104px] xl:col-span-1'
          : danger
            ? 'bg-card ring-error/25'
            : 'bg-card ring-border',
      ].join(' ')}
    >
      {permit ? (
        <span aria-hidden="true" className="sb-kerb sb-kerb-thin absolute inset-x-0 top-0" />
      ) : null}
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-[14px] ${
          permit
            ? 'h-14 w-14 bg-card text-primary shadow-card'
            : danger
              ? 'h-11 w-11 bg-tint-error text-error'
              : 'h-11 w-11 bg-tint-indigo text-indigo'
        }`}
      >
        <Icon name={icon} size={permit ? 36 : 22} color="currentColor" weight="duotone" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`font-sign text-[18px] font-bold leading-6 ${danger ? 'text-error' : 'text-text'}`}
        >
          {title}
        </span>
        <span className={`text-body-sm ${attention ? 'font-semibold text-primary' : 'text-muted'}`}>
          {subtitle}
        </span>
      </span>
      <Icon
        name="chevron-right"
        size={20}
        color="currentColor"
        className="shrink-0 text-muted transition-transform group-hover:translate-x-1"
      />
    </button>
  );
}

/**
 * The contract's milestones in date order on one rail: drawn up, started,
 * today, and its end (or cancellation); an open renewal adds a dashed mango
 * stretch after the end, without a new date (the ward has not decided).
 */
function ContractTimeline({
  contract,
  openRenewal,
  today,
}: {
  contract: RentalContract;
  openRenewal: RenewalRequest | undefined;
  today: Date;
}) {
  const now = today.getTime();
  const marks: { label: string; date: string | null; t: number; today?: boolean }[] = [];
  if (contract.createdAt && !Number.isNaN(Date.parse(contract.createdAt)))
    marks.push({
      label: 'Lập hợp đồng',
      date: contract.createdAt,
      t: Date.parse(contract.createdAt),
    });
  if (contract.startDate)
    marks.push({ label: 'Bắt đầu', date: contract.startDate, t: Date.parse(contract.startDate) });
  if (contract.cancelledAt && !Number.isNaN(Date.parse(contract.cancelledAt)))
    marks.push({
      label: 'Đã huỷ',
      date: contract.cancelledAt,
      t: Date.parse(contract.cancelledAt),
    });
  else if (contract.endDate)
    marks.push({ label: 'Hết hạn', date: contract.endDate, t: Date.parse(contract.endDate) });
  marks.push({ label: 'Hôm nay', date: null, t: now, today: true });
  marks.sort((a, b) => a.t - b.t);
  const todayIndex = marks.findIndex((m) => m.today);

  return (
    <section className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <h2 className="mb-md font-sign text-[18px] font-bold text-text">Dòng thời gian hợp đồng</h2>
      <ol className="flex flex-col gap-0 md:flex-row md:items-start">
        {marks.map((m, i) => {
          const passed = i <= todayIndex;
          const last = i === marks.length - 1;
          return (
            <li
              key={m.label}
              className="relative flex flex-1 gap-sm pb-md md:flex-col md:gap-xs md:pb-0"
            >
              {!last ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[7px] top-4 h-[calc(100%-8px)] w-1 rounded-full md:left-4 md:top-[6px] md:h-1 md:w-[calc(100%-8px)] ${
                    i < todayIndex ? 'bg-tertiary' : 'bg-border'
                  }`}
                />
              ) : openRenewal ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[8px] top-4 h-8 border-l-[3px] border-dashed border-accent md:left-4 md:top-[7px] md:h-0 md:w-[calc(100%-8px)] md:border-l-0 md:border-t-[3px]"
                />
              ) : null}
              {m.today ? (
                <span
                  aria-hidden="true"
                  className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand ring-4 ring-card"
                >
                  <Icon name="map-marker" size={10} color="#fff" />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={`relative z-10 h-4 w-4 shrink-0 rounded-full ring-4 ring-card ${
                    passed
                      ? 'bg-tertiary'
                      : 'bg-card ring-offset-0 outline outline-2 outline-border'
                  }`}
                />
              )}
              <div className="min-w-0 pr-sm">
                <p
                  className={`text-body-sm font-semibold ${m.today ? 'text-primary' : 'text-text'}`}
                >
                  {m.label}
                </p>
                {m.date ? (
                  <p className="font-tabular text-body-xs text-muted">{formatDate(m.date)}</p>
                ) : null}
                {last && openRenewal ? (
                  <p className="mt-1 text-body-xs font-semibold text-[#6B4100] dark:text-[#FFD27A]">
                    +{openRenewal.requestedTermDays} ngày · chờ Phường
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RenewalHistory({ renewals }: { renewals: RenewalRequest[] }) {
  return (
    <section className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <h2 className="mb-sm font-sign text-[18px] font-bold text-text">Lịch sử gia hạn</h2>
      <ul className="flex flex-col divide-y divide-border">
        {renewals.map((r) => (
          <li key={r.renewalId} className="flex flex-wrap items-center gap-x-md gap-y-1 py-sm">
            <span className="font-tabular text-body-sm text-muted">{formatDate(r.createdAt)}</span>
            <span className="font-sign text-[15px] font-bold text-text">
              +{r.requestedTermDays} ngày
            </span>
            <StatusChip code={r.renewalStatus} />
            {r.renewalStatus === 'APPROVED' && r.newEndDate ? (
              <span className="text-body-sm text-text">đến {formatDate(r.newEndDate)}</span>
            ) : null}
            {r.renewalStatus === 'REJECTED' && r.reviewDecisionReason ? (
              <span className="w-full text-body-sm text-[#8F1717] dark:text-[#FF9A90]">
                {r.reviewDecisionReason}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The slot itself: its photo (or a drawn bay), what it has, what it is for. */
function SlotSnapshot({ slot }: { slot: SidewalkSlot }) {
  const [broken, setBroken] = useState(false);
  const amenities: { on: boolean; icon: IconName; label: string }[] = [
    { on: !!slot.hasPower, icon: 'flash-outline', label: 'Điện' },
    { on: !!slot.hasWater, icon: 'water-outline', label: 'Nước' },
    { on: !!slot.hasTrashBin, icon: 'trash-can-outline', label: 'Thùng rác' },
  ];
  return (
    <section className="flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <h2 className="font-sign text-[18px] font-bold text-text">Ô của bạn</h2>
      {slot.imageUrl && !broken ? (
        <img
          src={slot.imageUrl}
          alt={`Ô ${slot.slotCode}`}
          loading="lazy"
          width={640}
          height={360}
          onError={() => setBroken(true)}
          className="aspect-video w-full rounded-[20px] object-cover ring-1 ring-border"
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-xs overflow-hidden rounded-[20px] bg-[#FFF3E8] dark:bg-[#2A2420]">
          <svg aria-hidden="true" viewBox="0 0 200 100" className="w-2/3 max-w-[260px]">
            <rect
              x="50"
              y="18"
              width="100"
              height="54"
              rx="6"
              strokeDasharray="8 6"
              fill="none"
              strokeWidth="3"
              className="stroke-brand"
            />
            <rect x="60" y="26" width="34" height="14" rx="3" className="fill-sign" />
            {Array.from({ length: 10 }, (_, i) => (
              <rect
                key={i}
                x={i * 20}
                y="86"
                width="20"
                height="10"
                className={i % 2 ? 'fill-kerb-paint' : 'fill-kerb'}
              />
            ))}
          </svg>
          <span className="text-body-sm text-muted">Chưa có ảnh ô</span>
        </div>
      )}
      <div className="flex flex-wrap gap-xs">
        {amenities.map((a) => (
          <span
            key={a.label}
            className={`inline-flex h-9 items-center gap-1 rounded-full px-sm text-body-sm ${
              a.on
                ? 'bg-[#E6F6EC] font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
                : 'text-muted line-through ring-1 ring-inset ring-border'
            }`}
          >
            <Icon name={a.icon} size={16} color="currentColor" />
            {a.label}
          </span>
        ))}
      </div>
      {slot.businessCategory ? (
        <p className="text-body-sm text-muted">
          Ngành:{' '}
          <span className="font-semibold text-text">
            {BUSINESS_CATEGORY_LABELS[slot.businessCategory]}
          </span>
        </p>
      ) : null}
      {slot.rentalMode === 'EVENT' ? (
        <p className="inline-flex w-fit items-center gap-1 rounded-full bg-tint-secondary px-sm py-1 text-body-sm font-semibold text-on-secondary">
          <Icon name="flag-outline" size={15} color="currentColor" />
          Thuê theo sự kiện
          {slot.eventEndDate ? ` · đến ${formatDate(slot.eventEndDate)}` : ''}
        </p>
      ) : null}
    </section>
  );
}

function ContractSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải hợp đồng" className="flex flex-col gap-lg">
        <Skeleton className="h-11 w-48" />
        <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[7fr_5fr] xl:gap-xl">
          <div className="flex flex-col gap-md rounded-[24px] bg-card p-lg ring-1 ring-border">
            <div className="flex items-center gap-lg">
              <Skeleton className="h-[168px] w-[168px] rounded-full" />
              <div className="flex flex-1 flex-col gap-sm">
                <Skeleton className="h-14 w-40" />
                <Skeleton className="h-5 w-56" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-[16px]" />
          </div>
          <div className="flex flex-col gap-sm">
            <Skeleton className="h-[104px] w-full rounded-[18px]" />
            <Skeleton className="h-[88px] w-full rounded-[18px]" />
            <Skeleton className="h-[88px] w-full rounded-[18px]" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
