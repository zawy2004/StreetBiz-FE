import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from 'react-native';

import { Button, Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function AddressUpdateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const registration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const requestAddressChange = useMockDb((s) => s.requestAddressChange);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string>();

  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  const submit = () => {
    if (!address.trim()) return setError('Vui lòng nhập địa chỉ mới.');
    requestAddressChange({
      vendorId: registration.vendorId,
      registrationId: registration.id,
      new_address: address,
    });
    showToast('Đã gửi yêu cầu đổi địa chỉ');
    router.back();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi yêu cầu" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đổi địa chỉ kinh doanh" back subtitle={registration.business_name} />
      <Card>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>
          Phường sẽ kiểm tra ô liền kề tại địa chỉ mới. Ô hiện tại được giữ trong thời gian ân hạn
          nếu còn phí chưa thanh toán.
        </Text>
      </Card>
      <TextField
        label="Địa chỉ kinh doanh mới"
        value={address}
        onChangeText={setAddress}
        placeholder="Số nhà, đường, phường"
        error={error}
      />
    </Screen>
  );
}
