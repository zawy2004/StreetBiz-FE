import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common';
import { PhoneField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function TransferInitiateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const initiateTransfer = useMockDb((s) => s.initiateTransfer);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();

  if (!contract) return <ErrorState message="Không tìm thấy hợp đồng." />;

  const submit = () => {
    if (phone.replace(/\D/g, '').length < 9) return setError('Số điện thoại chưa hợp lệ.');
    initiateTransfer(contract.id, contract.vendorId, phone);
    showToast('Đã gửi yêu cầu chuyển nhượng');
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
      <AppHeader
        title="Chuyển nhượng ô"
        back
        subtitle="Nhập số điện thoại hộ kinh doanh nhận chuyển nhượng"
      />
      <PhoneField value={phone} onChangeText={setPhone} error={error} />
    </Screen>
  );
}
