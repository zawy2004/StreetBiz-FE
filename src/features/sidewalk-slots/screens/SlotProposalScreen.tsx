import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { PhotoPicker, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { WARD } from '@/mocks/seed';

export function SlotProposalScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const proposeSlot = useMockDb((s) => s.proposeSlot);
  const [street, setStreet] = useState('');
  const [sizeM2, setSizeM2] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [error, setError] = useState<string>();

  const submit = () => {
    if (!street.trim()) return setError('Vui lòng nhập địa chỉ.');
    const size = Number(sizeM2);
    if (!size || size <= 0) return setError('Diện tích không hợp lệ.');
    if (!photoUri) return setError('Vui lòng chụp ảnh vị trí.');
    setError(undefined);

    proposeSlot({
      slot_code: `NEW-${Math.floor(100 + Math.random() * 900)}`,
      ward_unit_type: WARD.unit_type,
      street,
      size_m2: size,
      price_monthly: 0,
      time_window: '05:30 - 10:30',
      lat: 16.06,
      lng: 108.22,
      proposedByVendorId: user?.vendorId,
    });
    showToast('Đã gửi đề xuất ô mới, chờ Phường xét duyệt');
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi đề xuất" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đề xuất ô mới" back subtitle="Dành cho địa chỉ chưa có ô trong lưới" />
      <TextField
        label="Địa chỉ / vị trí"
        value={street}
        onChangeText={setStreet}
        placeholder="Số nhà, đường"
      />
      <TextField
        label="Diện tích ước tính (m²)"
        value={sizeM2}
        onChangeText={setSizeM2}
        keyboardType="numeric"
      />
      <PhotoPicker
        label="Ảnh vị trí"
        uri={photoUri}
        onChange={setPhotoUri}
        onRemove={() => setPhotoUri(undefined)}
      />
      {error ? <span className="text-body-sm text-error">{error}</span> : null}
    </Screen>
  );
}
