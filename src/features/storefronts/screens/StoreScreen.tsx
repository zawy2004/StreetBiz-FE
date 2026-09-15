import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { SegmentedControl, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { EmptyState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function StoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === user?.vendorId));
  const registrations = useMockDb((s) => s.registrations).filter(
    (r) => r.vendorId === user?.vendorId,
  );
  const contracts = useMockDb((s) => s.contracts).filter((c) => c.vendorId === user?.vendorId);
  const createStorefront = useMockDb((s) => s.createStorefront);
  const updateStorefront = useMockDb((s) => s.updateStorefront);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!env.enablePhase2) {
    return (
      <Screen>
        <AppHeader title="Cửa hàng" />
        <EmptyState icon="storefront-outline" title="Tính năng đang phát triển" />
      </Screen>
    );
  }

  const canCreate =
    registrations.some((r) => r.registration_status === 'APPROVED') &&
    contracts.some((c) => c.contract_status === 'ACTIVE');

  if (!storefront) {
    return (
      <Screen>
        <AppHeader title="Cửa hàng" />
        {!canCreate ? (
          <EmptyState
            icon="storefront-outline"
            title="Chưa đủ điều kiện mở gian hàng"
            description="Cần có hồ sơ đăng ký đã duyệt và một hợp đồng thuê ô đang hoạt động."
          />
        ) : (
          <>
            <TextField label="Tên gian hàng" value={name} onChangeText={setName} />
            <TextField
              label="Mô tả ngắn"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Button
              label="Tạo gian hàng"
              disabled={!name.trim()}
              onPress={() => {
                if (!user?.vendorId) return;
                createStorefront({
                  vendorId: user.vendorId,
                  name,
                  description,
                  openTime: '06:00',
                  closeTime: '10:30',
                  availability_status: 'OPEN',
                });
                showToast('Đã tạo gian hàng');
              }}
            />
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title={storefront.name} />
      <Section title="Trạng thái">
        <SegmentedControl
          value={storefront.availability_status}
          onChange={(v) => updateStorefront(storefront.id, { availability_status: v })}
          options={[
            { value: 'OPEN', label: 'Đang mở' },
            { value: 'PAUSED', label: 'Tạm dừng' },
            { value: 'CLOSED', label: 'Đóng cửa' },
          ]}
        />
      </Section>
      <Card>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>{storefront.description}</Text>
        <Text style={[typography.bodySm, { color: colors.muted, marginTop: spacing.sm }]}>
          Giờ mở cửa {storefront.openTime} – {storefront.closeTime}
        </Text>
      </Card>
      <Button label="Quản lý thực đơn" onPress={() => router.push('/vendor/store/menu')} />
      <Button
        label="Đơn hàng"
        variant="outline"
        onPress={() => router.push('/vendor/store/orders')}
      />
      <Button
        label="Doanh thu"
        variant="ghost"
        onPress={() => router.push('/vendor/store/sales')}
      />
    </Screen>
  );
}
