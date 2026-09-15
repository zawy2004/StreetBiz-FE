import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { EmptyState, showToast } from '@/components/feedback';
import { colors, spacing, statusTones, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

type Filter = 'ALL' | 'AVAILABLE' | 'RENTED';

export function SlotMapScreen() {
  const router = useRouter();
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
    router.push('/vendor/slots/rental-applications');
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
                    ? router.push(`/vendor/slots/${slot.id}`)
                    : undefined
              }
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 6, backgroundColor: tone.fg }} />
                <View style={{ flex: 1, padding: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[typography.headlineSm, { color: colors.text }]}>
                      {slot.slot_code}
                    </Text>
                    {isSelectable ? (
                      <MaterialCommunityIcons
                        name={
                          isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'
                        }
                        size={22}
                        color={isSelected ? colors.primary : colors.muted}
                      />
                    ) : (
                      <StatusChip code={slot.slot_status} />
                    )}
                  </View>
                  <Text style={[typography.bodyMd, { color: colors.muted, marginTop: 2 }]}>
                    {slot.street} · {slot.size_m2} m² · {slot.time_window}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <Money amountVnd={slot.price_monthly} />
                  </View>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
