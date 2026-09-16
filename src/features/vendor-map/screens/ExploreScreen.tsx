import { useNavigate } from 'react-router-dom';

import { Avatar, Card, Icon, IconButton } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { WARD } from '@/mocks/seed';

export function ExploreScreen() {
  const navigate = useNavigate();
  const vendors = useMockDb((s) => s.vendors);
  const contracts = useMockDb((s) => s.contracts).filter((c) => c.contract_status === 'ACTIVE');
  const permits = useMockDb((s) => s.permits);
  const slots = useMockDb((s) => s.slots);

  const activeVendors = contracts
    .map((c) => {
      const vendor = vendors.find((v) => v.id === c.vendorId);
      const permit = permits.find((p) => p.contractId === c.id);
      const slot = slots.find((s) => s.id === c.slotId);
      if (!vendor || !permit || !slot) return null;
      return { vendor, permit, slot };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <Screen>
      <AppHeader
        title="Khám phá"
        subtitle={WARD.unit_type}
        right={
          env.enablePhase2 ? (
            <IconButton
              icon="magnify"
              accessibilityLabel="Tìm kiếm"
              onPress={() => navigate('/customer/explore/search')}
            />
          ) : undefined
        }
      />
      {activeVendors.length === 0 ? (
        <EmptyState icon="storefront-outline" title="Chưa có hộ kinh doanh nào đang hoạt động" />
      ) : (
        activeVendors.map(({ vendor, permit, slot }) => (
          <Card
            key={vendor.id}
            onPress={() => navigate(`/customer/explore/vendors/${vendor.id}`)}
          >
            <div className="flex gap-sm">
              <Avatar name={vendor.business_name} size={48} />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="truncate text-headline-sm text-text">{vendor.business_name}</span>
                <span className="truncate text-body-sm text-muted">
                  {slot.street} · Ô {slot.slot_code}
                </span>
              </div>
              <StatusChip code={permit.permit_status} />
            </div>
          </Card>
        ))
      )}
      <div className="flex items-center justify-center gap-1.5">
        <Icon name="shield-check-outline" size={16} color={colors.tertiary} />
        <span className="text-body-sm text-muted">
          Chỉ hiển thị hộ kinh doanh có giấy phép hợp lệ
        </span>
      </div>
    </Screen>
  );
}
