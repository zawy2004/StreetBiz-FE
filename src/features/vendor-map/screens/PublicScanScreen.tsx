import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function PublicScanScreen() {
  const router = useRouter();
  const permits = useMockDb((s) => s.permits);
  const contracts = useMockDb((s) => s.contracts);
  const slots = useMockDb((s) => s.slots);
  const vendors = useMockDb((s) => s.vendors);
  const [code, setCode] = useState('');
  const [searched, setSearched] = useState(false);

  const permit = permits.find((p) => p.permit_code === code.trim());
  const contract = contracts.find((c) => c.id === permit?.contractId);
  const slot = slots.find((s) => s.id === contract?.slotId);
  const vendor = vendors.find((v) => v.id === contract?.vendorId);

  const isValid = permit?.permit_status === 'VALID';

  return (
    <Screen>
      <AppHeader title="Quét mã QR" subtitle="Xác thực giấy phép kinh doanh vỉa hè" />
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <MaterialCommunityIcons name="qrcode-scan" size={64} color={colors.muted} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Nhập mã giấy phép"
            value={code}
            onChangeText={setCode}
            placeholder="SB-HC1-2026-0815"
          />
        </View>
        <Button label="Kiểm tra" fullWidth={false} onPress={() => setSearched(true)} />
      </View>

      {searched && !permit ? (
        <EmptyState
          icon="qrcode-remove"
          title="Mã không hợp lệ"
          description="Không tìm thấy giấy phép tương ứng."
        />
      ) : null}

      {permit && vendor && slot ? (
        <>
          <Card
            style={isValid ? undefined : { backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>
                {vendor.business_name}
              </Text>
              <StatusChip code={permit.permit_status} />
            </View>
          </Card>
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.md }}>
              <ListRow title="Vị trí cấp phép" subtitle={`${slot.slot_code} · ${slot.street}`} />
              <Divider />
              <ListRow
                title="Hiệu lực đến"
                subtitle={new Date(permit.expires_at).toLocaleDateString('vi-VN')}
              />
            </View>
          </Card>
          <Button
            label="Xem hồ sơ hộ kinh doanh"
            variant="outline"
            onPress={() => router.push(`/customer/explore/vendors/${vendor.id}`)}
          />
          <Button
            label="Báo cáo bất thường"
            variant="ghost"
            onPress={() => router.push(`/customer/explore/vendors/${vendor.id}/reports/new`)}
          />
        </>
      ) : null}
    </Screen>
  );
}
