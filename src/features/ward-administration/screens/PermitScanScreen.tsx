import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function PermitScanScreen() {
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

  return (
    <Screen>
      <AppHeader title="Tuần tra hiện trường" subtitle="Quét / nhập mã giấy phép QR" />
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Mã giấy phép"
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
          title="Không tìm thấy giấy phép"
          description="Mã không hợp lệ hoặc chưa được cấp."
        />
      ) : null}

      {permit && contract && slot && vendor ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>
                {vendor.business_name}
              </Text>
              <StatusChip code={permit.permit_status} />
            </View>
          </Card>
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.md }}>
              <ListRow title="Ô cấp phép" subtitle={`${slot.slot_code} · ${slot.street}`} />
              <Divider />
              <ListRow title="Diện tích cho phép" subtitle={`${slot.size_m2} m²`} />
              <Divider />
              <ListRow
                title="Hiệu lực đến"
                subtitle={new Date(permit.expires_at).toLocaleDateString('vi-VN')}
              />
            </View>
          </Card>

          {env.enableAiCompliance ? (
            <AiHint title="Không phát hiện lệch vị trí">
              Vị trí quét khớp với toạ độ ô đã cấp phép trong 5 lần quét gần nhất.
            </AiHint>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Lập biên bản"
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: '/ward/patrol/violations/new',
                    params: { vendorId: vendor.id, slotId: slot.id },
                  })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Đình chỉ / thu hồi"
                variant="danger"
                onPress={() => router.push(`/ward/patrol/permits/${permit.id}/action`)}
              />
            </View>
          </View>
        </>
      ) : null}

      {!searched && !permit ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <MaterialCommunityIcons name="qrcode-scan" size={48} color={colors.muted} />
        </View>
      ) : null}
    </Screen>
  );
}
