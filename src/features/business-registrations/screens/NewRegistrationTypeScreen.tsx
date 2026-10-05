import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { SelectField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { VENDOR_TYPE } from '@/core/api';
import { useAuthStore } from '@/store/auth-store';
import { Stepper } from '../components/Stepper';
import { hasDraftContent, useNewRegistrationStore } from '../new-registration-store';

/** REG-01 step 1: choose the vendor type (BR-07 drives what step 2 asks for). */
export function NewRegistrationTypeScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const vendorType = useNewRegistrationStore((s) => s.vendorType);
  const registrationId = useNewRegistrationStore((s) => s.registrationId);
  const draftOwnerId = useNewRegistrationStore((s) => s.draftOwnerId);
  const resumable = useNewRegistrationStore((s) => registrationId === null && hasDraftContent(s));
  const setField = useNewRegistrationStore((s) => s.setField);
  const reset = useNewRegistrationStore((s) => s.reset);

  // The draft is kept in this browser; it belongs to whoever started it, never to the next account.
  useEffect(() => {
    if (draftOwnerId !== null && userId !== null && draftOwnerId !== userId) {
      reset();
      setField('draftOwnerId', userId);
    } else if (draftOwnerId === null && userId !== null) {
      setField('draftOwnerId', userId);
    }
  }, [draftOwnerId, userId, reset, setField]);

  const hasBasics = useNewRegistrationStore((s) => s.displayName.trim() !== '' && s.wardUnitId !== null);

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
      <Stepper step={1} total={5} label="Loại hình kinh doanh" />

      {resumable && draftOwnerId === userId ? (
        <Card>
          <p className="text-headline-md text-text">Bạn đang soạn dở một hồ sơ</p>
          <p className="mt-2xs text-body-sm text-muted">
            Thông tin đã nhập được giữ lại trên thiết bị này. Tiếp tục từ chỗ dừng, hoặc bắt đầu lại từ đầu.
          </p>
          <div className="mt-sm flex flex-row gap-xs">
            <Button
              label="Tiếp tục soạn"
              fullWidth={false}
              onPress={() => navigate(hasBasics ? '/vendor/registrations/new/review' : '/vendor/registrations/new/details')}
            />
            <Button label="Bắt đầu lại" variant="outline" fullWidth={false} onPress={reset} />
          </div>
        </Card>
      ) : null}

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
