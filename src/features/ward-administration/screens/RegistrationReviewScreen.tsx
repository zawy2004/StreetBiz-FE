import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function RegistrationReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const registration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const approve = useMockDb((s) => s.approveRegistration);
  const reject = useMockDb((s) => s.rejectRegistration);
  const requestEvidence = useMockDb((s) => s.requestRegistrationEvidence);
  const [note, setNote] = useState('');

  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  const act = (action: 'APPROVE' | 'REJECT' | 'EVIDENCE') => {
    if (action === 'APPROVE') approve(registration.id);
    if (action === 'REJECT') reject(registration.id, note || 'Hồ sơ chưa hợp lệ');
    if (action === 'EVIDENCE')
      requestEvidence(registration.id, note || 'Vui lòng bổ sung giấy tờ rõ nét hơn');
    showToast('Đã cập nhật hồ sơ');
    router.back();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <View style={{ flex: 1 }}>
            <Button label="Yêu cầu bổ sung" variant="outline" onPress={() => act('EVIDENCE')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Từ chối" variant="danger" onPress={() => act('REJECT')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Duyệt" variant="approve" onPress={() => act('APPROVE')} />
          </View>
        </StickyActions>
      }
    >
      <AppHeader title={registration.business_name} back />
      <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
        <StatusChip code={registration.registration_status} />
        {registration.fast_track ? <StatusChip label="Ưu tiên xét nhanh" tone="ok" /> : null}
      </View>

      {env.enableAiCompliance ? (
        <AiHint title="Đối chiếu tự động">
          Thông tin trên giấy phép kinh doanh khớp với dữ liệu hộ kinh doanh khai báo. Không phát
          hiện hồ sơ trùng lặp từ cùng số CCCD hoặc địa chỉ.
        </AiHint>
      ) : null}

      <Section title="Thông tin hộ kinh doanh">
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListRow title="Chủ hộ" subtitle={registration.owner_name} />
            <Divider />
            <ListRow title="Số CCCD" subtitle={registration.id_number} />
            <Divider />
            <ListRow
              title="Loại hình"
              subtitle={
                registration.vendor_type === 'FIXED_STOREFRONT'
                  ? 'Cửa hàng cố định'
                  : 'Bán hàng lưu động'
              }
            />
            <Divider />
            <ListRow title="Địa chỉ" subtitle={registration.address} />
          </View>
        </Card>
      </Section>

      <Section title="Giấy tờ minh chứng">
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {registration.evidence.map((ev) => (
            <View key={ev.type} style={{ alignItems: 'center', gap: 4 }}>
              {ev.uri ? (
                <Image
                  source={{ uri: ev.uri }}
                  style={{ width: 96, height: 96, borderRadius: 8 }}
                />
              ) : (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 8,
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              )}
              <Text style={[typography.bodySm, { color: colors.muted }]}>{ev.label}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Ghi chú phản hồi (nếu từ chối / yêu cầu bổ sung)">
        <TextField value={note} onChangeText={setNote} multiline placeholder="Nhập lý do..." />
      </Section>
    </Screen>
  );
}
