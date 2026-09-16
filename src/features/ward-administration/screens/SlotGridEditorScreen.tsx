import { useState } from 'react';

import { Button, Card, IconButton, Money } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { WARD } from '@/mocks/seed';

export function SlotGridEditorScreen() {
  const slots = useMockDb((s) => s.slots).filter((s) => s.proposal_review_status !== 'PENDING');
  const addSlot = useMockDb((s) => s.addSlotToGrid);
  const removeSlot = useMockDb((s) => s.removeSlot);
  const [street, setStreet] = useState('Nguyễn Văn Linh');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [toRemove, setToRemove] = useState<string>();

  const submit = () => {
    const sizeNum = Number(size);
    const priceNum = Number(price);
    if (!street.trim() || !sizeNum || !priceNum) return;
    addSlot({
      slot_code: `NVL-${Math.floor(100 + Math.random() * 900)}`,
      ward_unit_type: WARD.unit_type,
      street,
      size_m2: sizeNum,
      price_monthly: priceNum,
      time_window: '05:30 - 10:30',
      lat: 16.06,
      lng: 108.22,
    });
    setSize('');
    setPrice('');
    showToast('Đã thêm ô vào lưới');
  };

  return (
    <Screen>
      <AppHeader title="Cấu hình lưới ô" back subtitle={WARD.unit_type} />
      <Section title="Vẽ ô mới">
        <TextField label="Tuyến đường" value={street} onChangeText={setStreet} />
        <div className="flex flex-row gap-sm">
          <div className="flex-1">
            <TextField
              label="Diện tích (m²)"
              value={size}
              onChangeText={setSize}
              keyboardType="numeric"
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Giá/tháng (đ)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </div>
        </div>
        <Button label="Thêm ô" onPress={submit} disabled={!size || !price} />
      </Section>

      <Section title={`Ô hiện có (${slots.length})`}>
        {slots.map((slot) => (
          <Card key={slot.id}>
            <div className="flex flex-row items-center justify-between">
              <div>
                <p className="text-headline-sm text-text">{slot.slot_code}</p>
                <p className="text-body-sm text-muted">{slot.street}</p>
                <Money amountVnd={slot.price_monthly} />
              </div>
              <IconButton
                icon="trash-can-outline"
                accessibilityLabel="Xoá ô"
                color={colors.error}
                onPress={() => setToRemove(slot.id)}
              />
            </div>
          </Card>
        ))}
      </Section>

      <ConfirmDialog
        visible={!!toRemove}
        title="Xoá ô khỏi lưới?"
        description="Chỉ nên xoá ô chưa từng có hợp đồng thuê."
        confirmLabel="Xoá"
        confirmVariant="danger"
        onConfirm={() => {
          if (toRemove) removeSlot(toRemove);
          setToRemove(undefined);
        }}
        onCancel={() => setToRemove(undefined)}
      />
    </Screen>
  );
}
