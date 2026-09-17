import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { WardSelect } from '@/features/authentication/components/WardSelect';
import { VENDOR_TYPE } from '@/core/api';
import { Stepper } from '../components/Stepper';
import { useNewRegistrationStore } from '../new-registration-store';

/**
 * REG-01 step 2: business details.
 *
 * BR-07: a fixed storefront must declare an address; an itinerant vendor may
 * leave it blank. The ward is always required because the backend routes the
 * application to that ward's reviewer.
 */
export function NewRegistrationDetailsScreen() {
  const navigate = useNavigate();
  const draft = useNewRegistrationStore();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const needsAddress = draft.vendorType === VENDOR_TYPE.fixedStorefront;

  const submit = () => {
    const next: Record<string, string | undefined> = {};
    if (!draft.displayName.trim()) next.displayName = 'Vui lòng nhập tên hộ kinh doanh.';
    if (draft.wardUnitId === null) next.ward = 'Vui lòng chọn phường/xã.';
    if (needsAddress && !draft.declaredAddress.trim()) {
      next.address = 'Cửa hàng cố định cần nhập địa chỉ kinh doanh.';
    }

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
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
      <AppHeader
        title={draft.registrationId ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'}
        back
      />
      <Stepper step={2} total={3} label="Thông tin hộ kinh doanh" />

      <TextField
        label="Tên hộ kinh doanh"
        value={draft.displayName}
        onChangeText={(v) => draft.setField('displayName', v)}
        placeholder="VD: Xôi gà Bà Năm"
        error={errors.displayName}
      />
      <WardSelect
        value={draft.wardUnitId ?? undefined}
        onChange={(v) => draft.setField('wardUnitId', v ?? null)}
        label="Phường/xã quản lý"
        error={errors.ward}
        helperText="Hồ sơ sẽ được chuyển tới cán bộ của phường này."
      />
      <TextField
        label={needsAddress ? 'Địa chỉ kinh doanh' : 'Địa chỉ kinh doanh (không bắt buộc)'}
        value={draft.declaredAddress}
        onChangeText={(v) => draft.setField('declaredAddress', v)}
        placeholder="Số nhà, đường, phường"
        error={errors.address}
        helperText={
          needsAddress
            ? undefined
            : 'Bán hàng lưu động có thể bỏ trống và chọn ô vỉa hè sau khi được duyệt.'
        }
      />

      {needsAddress ? (
        <div className="flex gap-sm">
          <div className="flex-1">
            <TextField
              label="Vĩ độ (không bắt buộc)"
              value={draft.addressLatitude?.toString() ?? ''}
              onChangeText={(v) =>
                draft.setField('addressLatitude', v.trim() === '' ? null : Number(v))
              }
              keyboardType="numeric"
              placeholder="16.0678"
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Kinh độ (không bắt buộc)"
              value={draft.addressLongitude?.toString() ?? ''}
              onChangeText={(v) =>
                draft.setField('addressLongitude', v.trim() === '' ? null : Number(v))
              }
              keyboardType="numeric"
              placeholder="108.2208"
            />
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
