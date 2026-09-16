import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Icon, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { EmptyState, showToast } from '@/components/feedback';
import { colors, statusTones } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

type Filter = 'ALL' | 'AVAILABLE' | 'RENTED';

export function SlotMapScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const slots = useMockDb((s) => s.slots).filter((s) => s.proposal_review_status !== 'PENDING');
  const submitRentalApplication = useMockDb((s) => s.submitRentalApplication);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = slots.filter((s) => (filter === 'ALL' ? true : s.slot_status === filter));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!user?.vendorId || selected.length === 0) return;
    submitRentalApplication({
      vendorId: user.vendorId,
      slotIds: selected,
      application_type: 'OPEN_SLOT',
    });
    showToast(`Đã gửi đơn thuê ${selected.length} ô`);
    setSelected([]);
    setSelectMode(false);
    navigate('/vendor/slots/rental-applications');
  };

  return (
    <Screen
      footer={
        selectMode && selected.length > 0 ? (
          <StickyActions>
            <Button label={`Nộp đơn thuê (${selected.length} ô)`} onPress={submit} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader
        title="Ô vỉa hè"
        subtitle="Phường Hải Châu 1 · Nguyễn Văn Linh"
        right={
          <Button
            label={selectMode ? 'Xong' : 'Chọn nhiều ô'}
            variant={selectMode ? 'primary' : 'outline'}
            fullWidth={false}
            onPress={() => {
              setSelectMode((v) => !v);
              setSelected([]);
            }}
          />
        }
      />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'Tất cả', count: slots.length },
          {
            value: 'AVAILABLE',
            label: 'Còn trống',
            count: slots.filter((s) => s.slot_status === 'AVAILABLE').length,
          },
          {
            value: 'RENTED',
            label: 'Đã thuê',
            count: slots.filter((s) => s.slot_status === 'RENTED').length,
          },
        ]}
      />
      {filtered.length === 0 ? (
        <EmptyState icon="map-marker-outline" title="Không có ô phù hợp" />
      ) : (
        filtered.map((slot) => {
          const tone =
            statusTones[
              slot.slot_status === 'AVAILABLE'
                ? 'ok'
                : slot.slot_status === 'RENTED'
                  ? 'neutral'
                  : 'pending'
            ];
          const isSelectable = selectMode && slot.slot_status === 'AVAILABLE';
          const isSelected = selected.includes(slot.id);
          return (
            <Card
              key={slot.id}
              onPress={() =>
                isSelectable
                  ? toggle(slot.id)
                  : !selectMode
                    ? navigate(`/vendor/slots/${slot.id}`)
                    : undefined
              }
              padded={false}
              style={{ overflow: 'hidden' }}
            >
              <div className="flex">
                <div className="w-1.5" style={{ backgroundColor: tone.fg }} />
                <div className="flex-1 p-md">
                  <div className="flex justify-between">
                    <span className="text-headline-sm text-text">{slot.slot_code}</span>
                    {isSelectable ? (
                      <Icon
                        name={isSelected ? 'check-circle' : 'check-circle-outline'}
                        size={22}
                        color={isSelected ? colors.primary : colors.muted}
                      />
                    ) : (
                      <StatusChip code={slot.slot_status} />
                    )}
                  </div>
                  <p className="mt-0.5 text-body-md text-muted">
                    {slot.street} · {slot.size_m2} m² · {slot.time_window}
                  </p>
                  <div className="mt-1.5">
                    <Money amountVnd={slot.price_monthly} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
