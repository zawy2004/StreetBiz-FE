import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function AddressUpdateScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    navigate(-1);
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
        <p className="text-body-md text-muted">
          Phường sẽ kiểm tra ô liền kề tại địa chỉ mới. Ô hiện tại được giữ trong thời gian ân hạn
          nếu còn phí chưa thanh toán.
        </p>
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
