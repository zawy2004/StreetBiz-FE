import { useNavigate } from 'react-router-dom';

import { Button, Card, Icon, ListRow, type IconName } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors } from '@/theme';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function VendorHomeScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  // Shared with the registrations list/detail screens, so this stays correct
  // against StreetBiz-BE instead of always reporting "no registration yet".
  const { registrations, isLoading: registrationsLoading } = useRegistrations();
  const contracts = useMockDb((s) => s.contracts).filter(
    (c) => c.vendorId === user?.vendorId && c.contract_status === 'ACTIVE',
  );
  const feeItems = useMockDb((s) => s.feeItems).filter(
    (f) => f.vendorId === user?.vendorId && f.item_status === 'PENDING',
  );
  const penalties = useMockDb((s) => s.penalties).filter(
    (p) => p.vendorId === user?.vendorId && p.penalty_status === 'PENDING',
  );
  const permits = useMockDb((s) => s.permits).filter((p) =>
    contracts.some((c) => c.id === p.contractId),
  );

  const todos = [
    ...registrations
      .filter((r) => r.registrationStatus === 'MORE_INFORMATION_REQUIRED')
      .map((r) => ({
        key: r.registrationId,
        title: `Bổ sung hồ sơ: ${r.displayName}`,
        onPress: () => navigate(`/vendor/registrations/${r.registrationId}`),
      })),
    ...feeItems.map((f) => ({
      key: f.id,
      title: `Thanh toán phí ${f.period_label}`,
      onPress: () => navigate(`/vendor/finance/fees/${f.id}/payment`),
    })),
    ...penalties.map((p) => ({
      key: p.id,
      title: `Thanh toán biên bản phạt`,
      onPress: () => navigate(`/vendor/finance/penalties/${p.id}/payment`),
    })),
  ];

  const permit = permits[0];

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
                  <span className="truncate text-body-md font-tabular text-muted">{permit.permit_code}</span>
                </div>
                <StatusChip code={permit.permit_status} />
              </div>
            </Card>
          ) : null}

          <Section title="Lối tắt">
            <div className="grid grid-cols-2 gap-sm lg:grid-cols-1">
              <Shortcut
                icon="file-document-outline"
                label="Đăng ký kinh doanh"
                onPress={() => navigate('/vendor/registrations')}
              />
              <Shortcut icon="map-marker-radius-outline" label="Thuê ô vỉa hè" onPress={() => navigate('/vendor/slots')} />
            </div>
          </Section>
        </div>
      </div>
    </Screen>
  );
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
