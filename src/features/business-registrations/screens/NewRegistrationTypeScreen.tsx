import { useRouter } from 'expo-router';

import { Button } from '@/components/common';
import { SelectField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { Stepper } from '../components/Stepper';
import { useNewRegistrationStore } from '../new-registration-store';

export function NewRegistrationTypeScreen() {
  const router = useRouter();
  const vendorType = useNewRegistrationStore((s) => s.vendorType);
  const setField = useNewRegistrationStore((s) => s.setField);

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Tiếp tục"
            onPress={() => router.push('/vendor/registrations/new/details')}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Đăng ký kinh doanh" back />
      <Stepper step={1} total={3} label="Loại hình kinh doanh" />
      <SelectField
        value={vendorType}
        onChange={(v) => setField('vendorType', v)}
        options={[
          {
            value: 'ITINERANT',
            label: 'Bán hàng lưu động',
            description: 'Không có địa điểm cố định, chọn ô trống trên bản đồ vỉa hè',
          },
          {
            value: 'FIXED_STOREFRONT',
            label: 'Cửa hàng cố định',
            description: 'Có địa chỉ kinh doanh cố định, thuê ô liền kề mặt tiền',
          },
        ]}
      />
    </Screen>
  );
}
