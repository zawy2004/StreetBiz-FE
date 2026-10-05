import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { LoadingState } from '@/components/feedback';
import { AddressSearch } from '@/features/sidewalk-slots/components/AddressSearch';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { WardSelect } from '@/features/authentication/components/WardSelect';
import { VENDOR_TYPE } from '@/core/api';
import { Stepper } from '../components/Stepper';
import { useNewRegistrationStore } from '../new-registration-store';

// The Goong/mapbox bundle loads only when this step needs a map.
const LocationPicker = lazy(() =>
  import('@/features/sidewalk-slots/components/LocationPicker').then((m) => ({ default: m.LocationPicker })),
);

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
  const [viewKey, setViewKey] = useState(0);

  const needsAddress = draft.vendorType === VENDOR_TYPE.fixedStorefront;

  const submit = () => {
    const next: Record<string, string | undefined> = {};
    if (!draft.displayName.trim()) next.displayName = 'Vui lòng nhập tên hộ kinh doanh.';
    if (!draft.wardUnitId) next.ward = 'Vui lòng chọn phường/xã.';
    if (needsAddress && !draft.declaredAddress.trim()) {
      next.address = 'Cửa hàng cố định cần nhập địa chỉ kinh doanh.';
    }

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    navigate('/vendor/registrations/new/owner');
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
      <Stepper step={2} total={5} label="Thông tin hộ kinh doanh" />

      <TextField
        label="Tên hộ kinh doanh"
        value={draft.displayName}
        onChangeText={(v) => draft.setField('displayName', v)}
        placeholder="VD: Xôi gà Bà Năm"
        error={errors.displayName}
        maxLength={180}
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
        <div className="flex flex-col gap-xs">
          <p className="text-label-md text-text">Vị trí trên bản đồ (không bắt buộc)</p>
          <AddressSearch
            onPick={(match) => {
              draft.setField('addressLatitude', match.latitude);
              draft.setField('addressLongitude', match.longitude);
              setViewKey((key) => key + 1);
            }}
          />
          <Suspense fallback={<LoadingState label="Đang tải bản đồ" />}>
            <LocationPicker
              position={
                draft.addressLatitude !== null && draft.addressLongitude !== null
                  ? { latitude: draft.addressLatitude, longitude: draft.addressLongitude }
                  : null
              }
              viewKey={viewKey}
              onPick={(p) => {
                draft.setField('addressLatitude', p.latitude);
                draft.setField('addressLongitude', p.longitude);
              }}
            />
          </Suspense>
          <p className="text-body-sm text-muted">Tìm địa chỉ hoặc chạm vào bản đồ để đặt vị trí cửa hàng.</p>
        </div>
      ) : null}
    </Screen>
  );
}
