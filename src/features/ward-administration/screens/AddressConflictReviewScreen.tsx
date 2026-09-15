import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function AddressConflictReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const request = useMockDb((s) => s.addressChanges.find((a) => a.id === id));
  const slots = useMockDb((s) => s.slots);
  const resolve = useMockDb((s) => s.resolveAddressChange);

  if (!request) return <ErrorState message="Không tìm thấy yêu cầu." />;

  const conflicting = slots.find(
    (s) => request.new_address.includes(s.street) && s.slot_status === 'RENTED',
  );

  const act = (approve: boolean) => {
    resolve(request.id, approve);
    showToast(
      approve ? 'Đã duyệt đổi địa chỉ, ô cũ được giải phóng sau thời gian ân hạn' : 'Đã từ chối',
    );
    router.back();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <View style={{ flex: 1 }}>
            <Button label="Từ chối" variant="danger" onPress={() => act(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={conflicting ? 'Xếp hàng ưu tiên' : 'Duyệt'}
              variant="approve"
              onPress={() => act(true)}
            />
          </View>
        </StickyActions>
      }
    >
      <AppHeader title="Đổi địa chỉ kinh doanh" back />
      <Card>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>Địa chỉ mới</Text>
        <Text style={[typography.headlineSm, { color: colors.text }]}>{request.new_address}</Text>
      </Card>
      {conflicting ? (
        <Card style={{ backgroundColor: '#E09F3E18', borderColor: '#E09F3E40' }}>
          <Text style={[typography.bodyMd, { color: colors.onSecondary }]}>
            Ô liền kề tại địa chỉ mới ({conflicting.slot_code}) hiện đã có người thuê. Có thể xếp hộ
            kinh doanh này vào hàng ưu tiên khi ô trống, hoặc từ chối yêu cầu.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
