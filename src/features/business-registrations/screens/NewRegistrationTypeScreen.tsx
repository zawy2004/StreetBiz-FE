import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { SelectField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { VENDOR_TYPE } from '@/core/api';
import { Stepper } from '../components/Stepper';
import { useNewRegistrationStore } from '../new-registration-store';

/** REG-01 step 1: choose the vendor type (BR-07 drives what step 2 asks for). */
export function NewRegistrationTypeScreen() {
  const navigate = useNavigate();
  const vendorType = useNewRegistrationStore((s) => s.vendorType);
  const registrationId = useNewRegistrationStore((s) => s.registrationId);
  const setField = useNewRegistrationStore((s) => s.setField);

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Tiếp tục"
            onPress={() => navigate('/vendor/registrations/new/details')}
          />
        </StickyActions>
      }
    >
      <AppHeader
        title={registrationId ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'}
        back
      />
      <Stepper step={1} total={4} label="Loại hình kinh doanh" />
      <SelectField
        value={vendorType}
        onChange={(v) => setField('vendorType', v)}
        options={[
          {
            value: VENDOR_TYPE.itinerant,
            label: 'Bán hàng lưu động',
            description: 'Không có địa điểm cố định, chọn ô trống trên bản đồ vỉa hè',
          },
          {
            value: VENDOR_TYPE.fixedStorefront,
            label: 'Cửa hàng cố định',
            description: 'Có địa chỉ kinh doanh cố định, thuê ô liền kề mặt tiền',
          },
        ]}
      />
    </Screen>
  );
}
