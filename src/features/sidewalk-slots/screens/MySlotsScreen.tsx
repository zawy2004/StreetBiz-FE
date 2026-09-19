import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card, Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import { AppHeader, Screen } from '@/components/layout';
import { sideApi } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { summarizeMySlots, type SectionSummary } from '../my-slots-summary';

/**
 * Everything a vendor does *after* picking a slot -- applications, contracts,
 * transfers, proposing a new slot -- in one place, so the workspace screen can
 * stay about choosing a slot. Query keys match the list screens, so opening a
 * section reuses what is already loaded.
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

  return (
    <Screen>
      <AppHeader title="Thuê ô của tôi" back />
      <div className="flex w-full max-w-2xl flex-col gap-sm">
        <Section
          icon="format-list-bulleted"
          title="Đơn thuê ô"
          summary={summary.applications}
          onPress={() => navigate('/vendor/slots/rental-applications')}
        />
        <Section
          icon="file-document-outline"
          title="Hợp đồng thuê ô"
          summary={summary.contracts}
          onPress={() => navigate('/vendor/slots/contracts')}
        />
        <Section
          icon="swap-horizontal"
          title="Chuyển nhượng ô"
          summary={summary.transfers}
          onPress={() => navigate('/vendor/slots/transfers')}
        />
        <Section
          icon="map-marker-outline"
          title="Đề xuất ô mới"
          summary={{ text: 'Gửi vị trí chưa có trong danh sách', attention: false }}
          onPress={() => navigate('/vendor/slots/slot-proposals/new')}
        />
      </div>
    </Screen>
  );
}

function Section({
  icon,
  title,
  summary,
  onPress,
}: {
  icon: IconName;
  title: string;
  summary: SectionSummary;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <div className="flex items-center gap-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg">
          <Icon name={icon} size={22} color={colors.indigo} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-headline-sm text-text">{title}</p>
          <p className={`truncate text-body-sm ${summary.attention ? 'font-semibold text-primary' : 'text-muted'}`}>
            {summary.text}
          </p>
        </div>
        <Icon name="chevron-right" size={22} color={colors.muted} />
      </div>
    </Card>
  );
}
