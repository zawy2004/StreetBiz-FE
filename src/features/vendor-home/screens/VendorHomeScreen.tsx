import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Icon, ListRow, type IconName } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors } from '@/theme';
import { sideApi } from '@/core/api/side-api';
import { isLiveApi } from '@/core/config/env';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';
import { useFeeItems, usePenalties } from '@/features/fee-schedules/useFinance';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

// Same payable rules as FinanceHomeScreen. Mock penalties are PENDING, live ones UNPAID.
const PAYABLE_FEE = new Set(['PENDING', 'OVERDUE']);
const PAYABLE_PENALTY = new Set(['UNPAID', 'PENDING']);

type PermitCard = { contractId: number | string; label: string; status: string };

export function VendorHomeScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  // Shared with the registrations list/detail screens, so this stays correct
  // against StreetBiz-BE instead of always reporting "no registration yet".
  const { registrations, isLoading: registrationsLoading } = useRegistrations();
  // Unfiltered, so they share their cache with FinanceHomeScreen; both hooks
  // already switch between StreetBiz-BE and the mock store.
  const { feeItems } = useFeeItems();
  const { penalties } = usePenalties();
  const permit = useCurrentPermit();

  const todos = [
    ...registrations
      .filter((r) => r.registrationStatus === 'MORE_INFORMATION_REQUIRED')
      .map((r) => ({
        key: `registration-${r.registrationId}`,
        title: `Bổ sung hồ sơ: ${r.displayName}`,
        onPress: () => navigate(`/vendor/registrations/${r.registrationId}`),
      })),
    ...feeItems
      .filter((f) => PAYABLE_FEE.has(f.itemStatus))
      .map((f) => ({
        key: `fee-${f.feeItemId}`,
        title: `Thanh toán phí ${f.periodLabel}`,
        onPress: () => navigate(`/vendor/finance/fees/${f.feeItemId}/payment`),
      })),
    ...penalties
      .filter((p) => PAYABLE_PENALTY.has(p.penaltyStatus))
      .map((p) => ({
        key: `penalty-${p.penaltyId}`,
        title: `Thanh toán biên bản phạt`,
        onPress: () => navigate(`/vendor/finance/penalties/${p.penaltyId}/payment`),
      })),
  ];

  return (
    <Screen width="wide">
      <AppHeader title={`Chào ${user?.fullName ?? ''}`} subtitle="Hôm nay quán mình cần làm gì?" />

      <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-md">
          <Section title="Việc cần làm" description={todos.length > 0 ? `${todos.length} việc đang chờ bạn` : undefined}>
            {todos.length === 0 ? (
              <Card padded={false}>
                <EmptyState
                  icon="check-circle-outline"
                  title="Không có việc cần xử lý"
                  description="Phí, biên bản và yêu cầu bổ sung hồ sơ sẽ hiện ở đây."
                />
              </Card>
            ) : (
              <Card padded={false}>
                <div className="divide-y divide-border px-md">
                  {todos.map((t) => (
                    <ListRow
                      key={t.key}
                      title={t.title}
                      leading={
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint-primary">
                          <Icon name="alert-circle-outline" size={18} color={colors.primary} />
                        </span>
                      }
                      showChevron
                      onPress={t.onPress}
                    />
                  ))}
                </div>
              </Card>
            )}
          </Section>

          {!registrationsLoading && registrations.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon="file-document-outline"
                title="Chưa có hồ sơ đăng ký"
                description="Đăng ký kinh doanh để bắt đầu thuê ô vỉa hè hợp pháp."
                action={
                  <Button
                    label="Đăng ký ngay"
                    fullWidth={false}
                    onPress={() => navigate('/vendor/registrations/new/type')}
                  />
                }
              />
            </Card>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-md">
          {permit ? (
            <Card onPress={() => navigate(`/vendor/slots/contracts/${permit.contractId}/permit`)}>
              <div className="flex items-center gap-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-tint-tertiary">
                  <Icon name="qrcode" size={28} color={colors.tertiary} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2xs">
                  <span className="truncate text-headline-sm text-text">Giấy phép số</span>
                  <span className="truncate text-body-md font-tabular text-muted">{permit.label}</span>
                </div>
                <StatusChip code={permit.status} />
              </div>
            </Card>
          ) : null}

          <Section title="Lối tắt">
            {/* One per row on a phone: two columns leave ~100px for the label and
                cut every one of them short. */}
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-1">
              <Shortcut
                icon="file-document-outline"
                label="Đăng ký kinh doanh"
                onPress={() => navigate('/vendor/registrations')}
              />
              <Shortcut icon="map-marker-radius-outline" label="Thuê ô vỉa hè" onPress={() => navigate('/vendor/slots')} />
              <Shortcut
                icon="qrcode-scan"
                label="Quét mã nhận hàng"
                onPress={() => navigate('/vendor/orders/scan')}
              />
              <Shortcut
                icon="silverware-fork-knife"
                label="Cửa hàng & thực đơn"
                onPress={() => navigate('/vendor/store')}
              />
            </div>
          </Section>
        </div>
      </div>
    </Screen>
  );
}

/**
 * The permit of the vendor's first ACTIVE contract that has one (a just-approved
 * contract can be ACTIVE before its permit is issued). Live, it uses the same
 * query keys as ContractsListScreen and DigitalPermitScreen, so opening the
 * permit from here reuses the cache.
 */
function useCurrentPermit(): PermitCard | null {
  const user = useAuthStore((s) => s.user);

  const contracts = useQuery({
    queryKey: ['side', user?.id, 'contracts'],
    queryFn: () => sideApi.listContracts(),
    enabled: isLiveApi,
  });
  const active = (contracts.data ?? []).filter((c) => c.contractStatus === 'ACTIVE');
  const permits = useQueries({
    queries: active.map((contract) => ({
      queryKey: ['side', user?.id, 'permit', contract.contractId],
      queryFn: () => sideApi.getPermit(contract.contractId),
      enabled: isLiveApi,
      retry: false,
    })),
  });
  const withPermit = active
    .map((contract, i) => ({ contract, permit: permits[i]?.data }))
    .find((row) => row.permit);

  const mockContracts = useMockDb((s) => s.contracts).filter(
    (c) => c.vendorId === user?.vendorId && c.contract_status === 'ACTIVE',
  );
  const mockPermit = useMockDb((s) => s.permits).find((p) =>
    mockContracts.some((c) => c.id === p.contractId),
  );

  if (!isLiveApi) {
    return mockPermit
      ? { contractId: mockPermit.contractId, label: mockPermit.permit_code, status: mockPermit.permit_status }
      : null;
  }
  return withPermit?.permit
    ? {
        contractId: withPermit.contract.contractId,
        label: `Ô ${withPermit.contract.slotCode}`,
        status: withPermit.permit.effectiveStatus,
      }
    : null;
}

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <div className="flex items-center gap-sm">
        <Icon name={icon} size={22} color={colors.primary} />
        <span className="min-w-0 flex-1 truncate text-headline-sm text-text">{label}</span>
        <Icon name="chevron-right" size={18} color={colors.muted} />
      </div>
    </Card>
  );
}
