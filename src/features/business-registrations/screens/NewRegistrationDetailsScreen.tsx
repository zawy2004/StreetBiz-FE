import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { Stepper } from '../components/Stepper';
import { useNewRegistrationStore } from '../new-registration-store';

export function NewRegistrationDetailsScreen() {
  const navigate = useNavigate();
  const draft = useNewRegistrationStore();
  const [error, setError] = useState<string>();

  const submit = () => {
    if (!draft.businessName.trim()) return setError('Vui lòng nhập tên hộ kinh doanh.');
    if (!draft.ownerName.trim()) return setError('Vui lòng nhập tên chủ hộ.');
    if (!draft.idNumber.trim()) return setError('Vui lòng nhập số CCCD.');
    if (draft.vendorType === 'FIXED_STOREFRONT' && !draft.address.trim()) {
      return setError('Cửa hàng cố định cần nhập địa chỉ kinh doanh.');
    }
    setError(undefined);
    navigate('/vendor/registrations/new/evidence');
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Tiếp tục" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      <Stepper step={2} total={3} label="Thông tin hộ kinh doanh" />
      <TextField
        label="Tên hộ kinh doanh"
        value={draft.businessName}
        onChangeText={(v) => draft.setField('businessName', v)}
        placeholder="VD: Xôi gà Bà Năm"
      />
      <TextField
        label="Tên chủ hộ"
        value={draft.ownerName}
        onChangeText={(v) => draft.setField('ownerName', v)}
      />
      <TextField
        label="Số CCCD"
        value={draft.idNumber}
        onChangeText={(v) => draft.setField('idNumber', v)}
        keyboardType="number-pad"
      />
      {draft.vendorType === 'FIXED_STOREFRONT' ? (
        <TextField
          label="Địa chỉ kinh doanh"
          value={draft.address}
          onChangeText={(v) => draft.setField('address', v)}
          placeholder="Số nhà, đường, phường"
        />
      ) : null}
      {error ? <span className="text-body-sm text-error">{error}</span> : null}
    </Screen>
  );
}
