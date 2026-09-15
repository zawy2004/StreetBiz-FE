import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function RegistrationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const registration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const withdraw = useMockDb((s) => s.withdrawRegistration);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  const canWithdraw = ['PENDING', 'UNDER_REVIEW', 'NEEDS_INFO'].includes(
    registration.registration_status,
  );
  const isFixedApproved =
    registration.vendor_type === 'FIXED_STOREFRONT' &&
    registration.registration_status === 'APPROVED';

  return (
    <Screen
      footer={
        canWithdraw ? (
          <StickyActions>
            <Button label="Rút hồ sơ" variant="outline" onPress={() => setConfirmWithdraw(true)} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={registration.business_name} back />
      <Card>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={[typography.bodyMd, { color: colors.muted }]}>
              {registration.vendor_type === 'FIXED_STOREFRONT'
                ? 'Cửa hàng cố định'
                : 'Bán hàng lưu động'}
            </Text>
            <Text style={[typography.bodySm, { color: colors.muted }]}>
              Nộp ngày {new Date(registration.submitted_at).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          <StatusChip code={registration.registration_status} />
        </View>
      </Card>

      {registration.review_note ? (
        <Card style={{ backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }}>
          <Text style={[typography.label, { color: colors.error, marginBottom: 4 }]}>
            Phản hồi từ Phường
          </Text>
          <Text style={[typography.bodyMd, { color: colors.text }]}>
            {registration.review_note}
          </Text>
        </Card>
      ) : null}

      <Section title="Thông tin đã nộp">
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ListRow title="Chủ hộ" subtitle={registration.owner_name} />
            <Divider />
            <ListRow title="Số CCCD" subtitle={registration.id_number} />
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

      {isFixedApproved ? (
        <Section title="Tiếp theo">
          <Button
            label="Thuê ô vỉa hè liền kề"
            onPress={() => router.push(`/vendor/registrations/${registration.id}/adjacent-slot`)}
          />
          <Button
            label="Cập nhật địa chỉ kinh doanh"
            variant="outline"
            onPress={() => router.push(`/vendor/registrations/${registration.id}/address`)}
          />
        </Section>
      ) : null}

      <ConfirmDialog
        visible={confirmWithdraw}
        title="Rút hồ sơ đăng ký?"
        description="Bạn có thể nộp lại hồ sơ mới bất cứ lúc nào."
        confirmLabel="Rút hồ sơ"
        confirmVariant="danger"
        onConfirm={() => {
          withdraw(registration.id);
          setConfirmWithdraw(false);
          router.back();
        }}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </Screen>
  );
}
