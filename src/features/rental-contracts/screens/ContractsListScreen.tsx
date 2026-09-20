import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { sideApi } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { ContractCard } from '@/features/sidewalk-slots/components/ContractCard';
import { MySlotsTabs } from '@/features/sidewalk-slots/components/MySlotsTabs';
import { splitContracts } from '@/features/sidewalk-slots/my-slots-view';

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
  });

  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-md">
        <MySlotsTabs />
        <AppHeader title="Hợp đồng thuê ô" subtitle="Thời hạn và giá thuê các ô của bạn" back />
        {contracts.isPending && <LoadingState />}
        {contracts.error && <ErrorState message={contracts.error.message} onRetry={() => void contracts.refetch()} />}
        {contracts.data && contracts.data.length === 0 && (
          <EmptyState icon="file-document-outline" title="Chưa có hợp đồng nào" />
        )}

        {live.length > 0 && (
          <section className="flex flex-col gap-sm">
            <SectionTitle title="Đang hiệu lực" count={live.length} dot={colors.tertiary} />
            <div className="grid gap-sm md:grid-cols-2">
              {live.map((c) => (
                <ContractCard key={c.contractId} contract={c} live today={today} {...card(c.contractId)} />
              ))}
            </div>
          </section>
        )}

        {ended.length > 0 && (
          <section className="flex flex-col gap-sm">
            <button
              type="button"
              onClick={() => setShowEnded((v) => !v)}
              aria-expanded={showEnded}
              className="flex items-center justify-between text-left"
            >
              <SectionTitle title="Đã kết thúc" count={ended.length} dot={colors.muted} />
              <Icon name="chevron-down" size={22} color={colors.muted} className={showEnded ? 'rotate-180' : ''} />
            </button>
            {showEnded && (
              <div className="grid gap-sm md:grid-cols-2">
                {ended.map((c) => (
                  <ContractCard key={c.contractId} contract={c} live={false} today={today} {...card(c.contractId)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Screen>
  );
}

function SectionTitle({ title, count, dot }: { title: string; count: number; dot: string }) {
  return (
    <h2 className="flex items-center gap-xs text-headline-sm text-text">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />
      {title}
      <span className="rounded-full bg-tint-muted px-xs text-badge text-muted">{count}</span>
    </h2>
  );
}
