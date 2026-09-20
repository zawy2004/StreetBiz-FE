import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { AppHeader, Screen } from '@/components/layout';
import { sideApi } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { ActionRow } from '../components/ActionRow';
import { summarizeMySlots } from '../my-slots-summary';

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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-sm">
        <AppHeader title="Thuê ô của tôi" back />
        <ActionRow
          icon="format-list-bulleted"
          title="Đơn thuê ô"
          subtitle={summary.applications.text}
          attention={summary.applications.attention}
          onPress={() => navigate('/vendor/slots/rental-applications')}
        />
        <ActionRow
          icon="file-document-outline"
          title="Hợp đồng thuê ô"
          subtitle={summary.contracts.text}
          attention={summary.contracts.attention}
          onPress={() => navigate('/vendor/slots/contracts')}
        />
        <ActionRow
          icon="swap-horizontal"
          title="Chuyển nhượng ô"
          subtitle={summary.transfers.text}
          attention={summary.transfers.attention}
          onPress={() => navigate('/vendor/slots/transfers')}
        />
        <ActionRow
          icon="map-marker-outline"
          title="Đề xuất ô mới"
          subtitle="Gửi vị trí chưa có trong danh sách"
          onPress={() => navigate('/vendor/slots/slot-proposals/new')}
        />
      </div>
    </Screen>
  );
}
