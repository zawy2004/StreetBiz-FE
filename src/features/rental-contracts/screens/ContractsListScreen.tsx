import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { sideApi, type RentalContract } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { ContractCard } from '@/features/sidewalk-slots/components/ContractCard';
import { MySlotsTabs } from '@/features/sidewalk-slots/components/MySlotsTabs';
import { contractProgress, splitContracts } from '@/features/sidewalk-slots/my-slots-view';
import { TermTimeline } from '../components/TermTimeline';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * The vendor's contracts: one sentence on where they stand, every live term on
 * a single calendar rule, then a card per contract with its term ring. Ended
 * contracts stay folded away until asked for.
 */
export function ContractsListScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [showEnded, setShowEnded] = useState(false);

  const contracts = useQuery({
    queryKey: ['side', userId, 'contracts'],
    queryFn: () => sideApi.listContracts(),
  });

  const { live, ended } = splitContracts(contracts.data ?? []);
  const today = new Date();
  const card = (contractId: number) => ({
    onOpen: () => navigate(`/vendor/slots/contracts/${contractId}`),
    onRenew: () => navigate(`/vendor/slots/contracts/${contractId}/renewal`),
    onPermit: () => navigate(`/vendor/slots/contracts/${contractId}/permit`),
  });

  return (
    <Screen>
      <MySlotsTabs />
      <AppHeader title="Hợp đồng thuê ô" subtitle="Thời hạn và giá thuê các ô của bạn" back />
      {contracts.isPending && <ContractsSkeleton />}
      {contracts.error && (
        <ErrorState message={contracts.error.message} onRetry={() => void contracts.refetch()} />
      )}
      {contracts.data && contracts.data.length === 0 && (
        <EmptyState
          icon="file-document-outline"
          title="Chưa có hợp đồng nào"
          action={
            <Button
              label="Chọn ô để thuê"
              variant="outline"
              fullWidth={false}
              onPress={() => navigate('/vendor/slots')}
            />
          }
        />
      )}

      {contracts.data && contracts.data.length > 0 && (
        <ContractsSummary live={live} today={today} onRent={() => navigate('/vendor/slots')} />
      )}

      {live.length > 0 && (
        <>
          <TermTimeline contracts={live} today={today} />
          <section className="flex flex-col gap-sm">
            <h2>
              <SectionTitle title="Đang hiệu lực" count={live.length} dot="bg-tertiary" />
            </h2>
            <div className="grid gap-md md:grid-cols-2">
              {live.map((c) => (
                <ContractCard
                  key={c.contractId}
                  contract={c}
                  live
                  today={today}
                  {...card(c.contractId)}
                />
              ))}
              {live.length === 1 ? (
                <RenewHintCard onRent={() => navigate('/vendor/slots')} />
              ) : null}
            </div>
          </section>
        </>
      )}

      {ended.length > 0 && (
        <section className="flex flex-col gap-sm">
          <h2>
            <button
              type="button"
              onClick={() => setShowEnded((v) => !v)}
              aria-expanded={showEnded}
              className="flex min-h-12 w-full items-center justify-between rounded-[16px] bg-card px-md text-left shadow-card ring-1 ring-border transition-colors hover:bg-sunken"
            >
              <SectionTitle title="Đã kết thúc" count={ended.length} dot="bg-muted" />
              <Icon
                name="chevron-down"
                size={22}
                color="currentColor"
                className={`text-muted transition-transform duration-200 ${showEnded ? 'rotate-180' : ''}`}
              />
            </button>
          </h2>
          {showEnded && (
            <div className="grid gap-md md:grid-cols-2">
              {ended.map((c) => (
                <ContractCard
                  key={c.contractId}
                  contract={c}
                  live={false}
                  today={today}
                  {...card(c.contractId)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </Screen>
  );
}

/** "2 hợp đồng đang hiệu lực, 1 cần gia hạn trong 14 ngày tới. Hết hạn sớm nhất: …" */
function ContractsSummary({
  live,
  today,
  onRent,
}: {
  live: RentalContract[];
  today: Date;
  onRent: () => void;
}) {
  if (live.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-sm rounded-[16px] bg-card p-md shadow-card ring-1 ring-border">
        <p className="text-body-md text-text">Không có hợp đồng đang hiệu lực</p>
        <Button label="Thuê ô mới" fullWidth={false} onPress={onRent} />
      </div>
    );
  }
  const dated = live.filter((c) => c.startDate && c.endDate);
  const soon = dated.filter(
    (c) =>
      c.contractStatus === 'ACTIVE' && contractProgress(c.startDate, c.endDate, today).expiringSoon,
  ).length;
  const earliest = dated.map((c) => c.endDate).sort()[0];
  return (
    <p className="text-body-lg text-text">
      <span className="font-semibold">{live.length} hợp đồng đang hiệu lực</span>
      {soon > 0 ? (
        <>
          , <span className="font-semibold text-primary">{soon} cần gia hạn trong 14 ngày tới</span>
        </>
      ) : null}
      .{earliest ? ` Hết hạn sớm nhất: ${formatDate(earliest)}.` : ''}
    </p>
  );
}

function RenewHintCard({ onRent }: { onRent: () => void }) {
  return (
    <aside className="flex h-full flex-col justify-between gap-md rounded-[22px] border-2 border-dashed border-brand/40 bg-[#FFF3E8] p-md dark:bg-[#2A2420] md:p-lg">
      <div className="flex items-start gap-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-card"
        >
          <Icon name="timer-outline" size={20} color="currentColor" weight="fill" />
        </span>
        <p className="text-body-md text-text">
          Gia hạn trước 14 ngày để không gián đoạn giấy phép.
        </p>
      </div>
      <Button
        label="Thuê thêm ô"
        variant="outline"
        fullWidth={false}
        icon={<Icon name="map-outline" size={18} color="currentColor" />}
        onPress={onRent}
      />
    </aside>
  );
}

function SectionTitle({ title, count, dot }: { title: string; count: number; dot: string }) {
  return (
    <span className="flex items-center gap-xs font-sign text-[18px] font-bold text-text">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {title}
      <span className="rounded-full bg-tint-muted px-xs font-sans text-badge text-muted">
        {count}
      </span>
    </span>
  );
}

function ContractsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải hợp đồng" className="flex flex-col gap-md">
      <Skeleton className="h-6 w-96 max-w-full" />
      <Skeleton className="h-36 w-full rounded-[20px]" />
      <div className="grid gap-md md:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-sm rounded-[22px] bg-card p-lg ring-1 ring-border"
          >
            <Skeleton className="h-8 w-28" />
            <div className="flex items-center gap-md">
              <Skeleton className="h-[72px] w-[72px] rounded-full" />
              <Skeleton className="h-8 w-36" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
