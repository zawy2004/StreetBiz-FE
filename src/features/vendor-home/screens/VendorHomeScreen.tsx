import { useNavigate } from 'react-router-dom';

import { Button, Card, Icon, ListRow } from '@/components/common';
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
    <Screen>
      <AppHeader title={`Chào ${user?.fullName ?? ''}`} subtitle="Hộ kinh doanh" />

      {permit ? (
        <Card onPress={() => navigate(`/vendor/slots/contracts/${permit.contractId}/permit`)}>
          <div className="flex items-center gap-sm">
            <Icon name="qrcode" size={28} color={colors.tertiary} />
            <div className="flex flex-1 flex-col gap-2xs">
              <span className="truncate text-headline-sm text-text">Giấy phép số</span>
              <span className="truncate text-body-md text-muted">{permit.permit_code}</span>
            </div>
            <StatusChip code={permit.permit_status} />
          </div>
        </Card>
      ) : null}

      <Section title="Việc cần làm">
        {todos.length === 0 ? (
          <EmptyState icon="check-circle-outline" title="Không có việc cần xử lý" />
        ) : (
          <Card padded={false}>
            <div className="px-md">
              {todos.map((t) => (
                <ListRow key={t.key} title={t.title} showChevron onPress={t.onPress} />
              ))}
            </div>
          </Card>
        )}
      </Section>

      <Section title="Lối tắt">
        <div className="flex flex-wrap gap-sm">
          <div className="min-w-[150px] grow">
            <Button
              label="Đăng ký kinh doanh"
              variant="outline"
              onPress={() => navigate('/vendor/registrations')}
            />
          </div>
          <div className="min-w-[150px] grow">
            <Button
              label="Thuê ô vỉa hè"
              variant="outline"
              onPress={() => navigate('/vendor/slots')}
            />
          </div>
        </div>
      </Section>

      {!registrationsLoading && registrations.length === 0 ? (
        <EmptyState
          icon="file-document-outline"
          title="Chưa có hồ sơ đăng ký"
          description="Đăng ký kinh doanh để bắt đầu thuê ô vỉa hè hợp pháp."
          action={
            <Button
              label="Đăng ký ngay"
              onPress={() => navigate('/vendor/registrations/new/type')}
            />
          }
        />
      ) : null}
    </Screen>
  );
}
